import asyncio
import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from starlette.responses import StreamingResponse

from .config import GLM_ANTHROPIC_URL, GLM_MODEL_ID, MCP_SERVER_CONFIG, SYSTEM_PROMPT


def create_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model=GLM_MODEL_ID,
        anthropic_api_url=GLM_ANTHROPIC_URL,
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", "not-needed"),
        temperature=0.7,
        max_tokens=8192,
    )


_agent_instance = None
_mcp_client = None


async def get_or_create_agent():
    global _agent_instance, _mcp_client
    if _agent_instance is not None:
        return _agent_instance

    _mcp_client = MultiServerMCPClient(MCP_SERVER_CONFIG)
    tools = await _mcp_client.get_tools()
    llm = create_llm()
    _agent_instance = create_react_agent(llm, tools, prompt=SYSTEM_PROMPT)
    return _agent_instance


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    global _agent_instance, _mcp_client
    _agent_instance = None
    _mcp_client = None


app = FastAPI(title="StoryWeave Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict]


class ChatMessage(BaseModel):
    role: str
    content: str


def _build_lc_messages(messages: list[dict]) -> list[BaseMessage]:
    lc_messages: list[BaseMessage] = []
    for msg in messages:
        if msg.get("role") == "user":
            lc_messages.append(HumanMessage(content=msg.get("content", "")))
        else:
            lc_messages.append(AIMessage(content=msg.get("content", "")))
    return lc_messages


@app.get("/api/agent/health")
async def health():
    return {"status": "ok"}


def _extract_text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts)
    return str(content)


@app.post("/api/agent/chat")
async def chat(request: ChatRequest):
    agent = await get_or_create_agent()
    lc_messages = _build_lc_messages(request.messages)
    result = await agent.ainvoke({"messages": lc_messages})
    final = result["messages"][-1]
    return {"role": "assistant", "content": _extract_text(final.content)}


@app.post("/api/agent/chat/stream")
async def chat_stream(request: ChatRequest):
    agent = await get_or_create_agent()
    lc_messages = _build_lc_messages(request.messages)

    async def event_generator():
        try:
            async for event in agent.astream_events(
                {"messages": lc_messages}, version="v2"
            ):
                kind = event.get("event")
                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if hasattr(chunk, "content") and chunk.content:
                        text = chunk.content
                        if isinstance(text, list):
                            for block in text:
                                if isinstance(block, dict) and block.get("type") == "text":
                                    data = json.dumps(
                                        {"type": "text", "content": block["text"]},
                                        ensure_ascii=False,
                                    )
                                    yield f"data: {data}\n\n"
                        elif isinstance(text, str):
                            data = json.dumps(
                                {"type": "text", "content": text},
                                ensure_ascii=False,
                            )
                            yield f"data: {data}\n\n"
                elif kind == "on_tool_start":
                    tool_name = event.get("name", "unknown")
                    tool_input = event.get("data", {}).get("input", {})
                    data = json.dumps(
                        {
                            "type": "tool_start",
                            "name": tool_name,
                            "input": tool_input,
                        },
                        ensure_ascii=False,
                    )
                    yield f"data: {data}\n\n"
                elif kind == "on_tool_end":
                    tool_name = event.get("name", "unknown")
                    data = json.dumps(
                        {"type": "tool_end", "name": tool_name},
                        ensure_ascii=False,
                    )
                    yield f"data: {data}\n\n"
            data = json.dumps({"type": "done"}, ensure_ascii=False)
            yield f"data: {data}\n\n"
        except Exception as e:
            data = json.dumps(
                {"type": "error", "content": str(e)}, ensure_ascii=False
            )
            yield f"data: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def run_server():
    import uvicorn

    uvicorn.run(
        "agent.server:app",
        host="0.0.0.0",
        port=int(os.environ.get("AGENT_PORT", "8000")),
        reload=False,
    )


if __name__ == "__main__":
    run_server()
