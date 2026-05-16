import asyncio
import json
import os
from typing import Any

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent

from .config import AGENT_MAX_TOKENS, AGENT_RECURSION_LIMIT, GLM_ANTHROPIC_URL, GLM_MODEL_ID, MCP_SERVER_CONFIG, SYSTEM_PROMPT


def create_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model=GLM_MODEL_ID,
        anthropic_api_url=GLM_ANTHROPIC_URL,
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", "not-needed"),
        temperature=0.7,
        max_tokens=AGENT_MAX_TOKENS,
    )


class StoryWeaveAgent:
    def __init__(self):
        self._client: MultiServerMCPClient | None = None
        self._agent = None
        self._tools = None

    async def start(self):
        self._client = MultiServerMCPClient(MCP_SERVER_CONFIG)
        self._tools = await self._client.get_tools()
        llm = create_llm()
        self._agent = create_react_agent(llm, self._tools, prompt=SYSTEM_PROMPT)

    async def stop(self):
        if self._client:
            self._client = None
            self._agent = None
            self._tools = None

    async def chat(self, messages: list[BaseMessage]) -> AIMessage:
        if not self._agent:
            raise RuntimeError("Agent not started. Call start() first.")
        config = {"recursion_limit": AGENT_RECURSION_LIMIT}
        result = await self._agent.ainvoke({"messages": messages}, config=config)
        return result["messages"][-1]

    async def chat_stream(self, messages: list[BaseMessage]):
        if not self._agent:
            raise RuntimeError("Agent not started. Call start() first.")
        config = {"recursion_limit": AGENT_RECURSION_LIMIT}
        async for event in self._agent.astream_events(
            {"messages": messages}, config=config, version="v2"
        ):
            kind = event.get("event")
            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if hasattr(chunk, "content") and chunk.content:
                    text = chunk.content
                    if isinstance(text, list):
                        for block in text:
                            if isinstance(block, dict) and block.get("type") == "text":
                                yield block["text"]
                    elif isinstance(text, str):
                        yield text
            elif kind == "on_tool_start":
                tool_name = event.get("name", "unknown")
                tool_input = event.get("data", {}).get("input", {})
                yield f"\n🔧 调用工具: {tool_name}\n"
                if tool_input:
                    yield f"   参数: {json.dumps(tool_input, ensure_ascii=False, indent=2)[:200]}\n\n"
            elif kind == "on_tool_end":
                tool_name = event.get("name", "unknown")
                yield f"✅ 工具完成: {tool_name}\n\n"

    def get_tools_description(self) -> list[dict]:
        if not self._tools:
            return []
        return [
            {"name": t.name, "description": t.description}
            for t in self._tools
        ]


_agent_instance: StoryWeaveAgent | None = None


async def get_agent() -> StoryWeaveAgent:
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = StoryWeaveAgent()
        await _agent_instance.start()
    return _agent_instance


async def shutdown_agent():
    global _agent_instance
    if _agent_instance:
        await _agent_instance.stop()
        _agent_instance = None
