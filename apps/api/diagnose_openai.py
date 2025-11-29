"""Diagnostic script for OpenAI AsyncClient initialization issue."""
import sys

print("=== Environment Diagnostics ===\n")
print(f"Python version: {sys.version}")
print(f"Python executable: {sys.executable}\n")

# Check installed versions
try:
    import openai
    print(f"✅ openai version: {openai.__version__}")
except Exception as e:
    print(f"❌ openai import failed: {e}")

try:
    import httpx
    print(f"✅ httpx version: {httpx.__version__}")
except Exception as e:
    print(f"❌ httpx import failed: {e}")

try:
    import httpcore
    print(f"✅ httpcore version: {httpcore.__version__}")
except Exception as e:
    print(f"❌ httpcore import failed: {e}")

print("\n=== Testing AsyncOpenAI initialization ===\n")

# Test basic initialization
try:
    import openai
    client = openai.AsyncOpenAI(
        api_key="sk-test123",
        timeout=30,
        max_retries=2
    )
    print("✅ AsyncOpenAI initialized successfully!")
    print(f"   Client type: {type(client)}")
except Exception as e:
    print(f"❌ AsyncOpenAI initialization failed:")
    print(f"   Error: {e}")
    print(f"   Error type: {type(e).__name__}")
    import traceback
    traceback.print_exc()

print("\n=== Recommended Fix ===\n")
print("If initialization failed, run:")
print("  pip uninstall httpx httpcore -y")
print("  pip install httpx==0.24.1 httpcore==0.17.3")
print("  pip install openai==1.30.0")
