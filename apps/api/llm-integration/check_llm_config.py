"""Verify LLM configuration and connectivity."""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

def check_config():
    """Check LLM configuration."""
    print("\n" + "=" * 70)
    print("  🔍 LLM Configuration Check")
    print("=" * 70 + "\n")
    
    issues = []
    warnings = []
    
    # Check if enabled
    llm_enabled = os.getenv("LLM_ENABLED", "false").lower()
    print(f"1️⃣  LLM_ENABLED: {llm_enabled}")
    
    if llm_enabled != "true":
        print("   ⚠️  LLM scoring is disabled")
        print("   💡 Set LLM_ENABLED=true in .env to enable\n")
        return False
    else:
        print("   ✅ LLM scoring is enabled\n")
    
    # Check provider
    provider = os.getenv("LLM_PROVIDER", "")
    print(f"2️⃣  LLM_PROVIDER: {provider or '(not set)'}")
    
    if not provider:
        issues.append("LLM_PROVIDER not set")
        print("   ❌ Provider not configured\n")
    elif provider not in ["openai", "anthropic"]:
        issues.append(f"Invalid provider: {provider}")
        print(f"   ❌ Invalid provider (must be 'openai' or 'anthropic')\n")
    else:
        print(f"   ✅ Valid provider\n")
    
    # Check API key
    api_key = os.getenv("LLM_API_KEY", "")
    print(f"3️⃣  LLM_API_KEY: {'*' * 20}... ({len(api_key)} chars)")
    
    if not api_key:
        issues.append("LLM_API_KEY not set")
        print("   ❌ API key missing\n")
    elif len(api_key) < 20:
        issues.append("API key seems too short")
        print("   ⚠️  API key seems unusually short\n")
    else:
        # Validate key format
        if provider == "openai" and not api_key.startswith("sk-"):
            warnings.append("OpenAI keys usually start with 'sk-'")
            print("   ⚠️  OpenAI keys typically start with 'sk-'\n")
        elif provider == "anthropic" and not api_key.startswith("sk-ant-"):
            warnings.append("Anthropic keys usually start with 'sk-ant-'")
            print("   ⚠️  Anthropic keys typically start with 'sk-ant-'\n")
        else:
            print("   ✅ API key format looks correct\n")
    
    # Check model
    model = os.getenv("LLM_MODEL", "")
    print(f"4️⃣  LLM_MODEL: {model or '(not set)'}")
    
    if not model:
        warnings.append("LLM_MODEL not set, will use default")
        print("   ⚠️  Model not specified (will use default)\n")
    else:
        # Suggest models
        recommended = {
            "openai": ["gpt-4o-mini", "gpt-4o"],
            "anthropic": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"]
        }
        
        if provider in recommended and model not in recommended[provider]:
            warnings.append(f"Uncommon model for {provider}: {model}")
            print(f"   ⚠️  Uncommon model (recommended: {', '.join(recommended[provider])})\n")
        else:
            print("   ✅ Model looks good\n")
    
    # Check timeout
    timeout = os.getenv("LLM_TIMEOUT_S", "10")
    print(f"5️⃣  LLM_TIMEOUT_S: {timeout}s")
    
    try:
        timeout_val = int(timeout)
        if timeout_val < 5:
            warnings.append("Timeout might be too short")
            print("   ⚠️  Timeout might be too short (recommend 10s minimum)\n")
        elif timeout_val > 30:
            warnings.append("Very long timeout")
            print("   ⚠️  Very long timeout (might impact user experience)\n")
        else:
            print("   ✅ Reasonable timeout\n")
    except:
        issues.append("Invalid timeout value")
        print("   ❌ Invalid timeout value\n")
    
    # Check dependencies
    print("6️⃣  Python Dependencies:")
    
    dependencies_ok = True
    
    try:
        if provider == "openai":
            import openai
            print(f"   ✅ openai library installed (v{openai.__version__})")
        elif provider == "anthropic":
            import anthropic
            print(f"   ✅ anthropic library installed (v{anthropic.__version__})")
    except ImportError as e:
        issues.append(f"Missing dependency: {e.name}")
        print(f"   ❌ {e.name} library not installed")
        print(f"      Run: pip install {e.name}")
        dependencies_ok = False
    
    print()
    
    # Test connectivity (optional)
    if dependencies_ok and not issues and api_key:
        print("7️⃣  Testing API Connectivity...")
        test_passed = test_api_connectivity(provider, api_key, model)
        print()
    
    # Summary
    print("=" * 70)
    print("  📋 SUMMARY")
    print("=" * 70 + "\n")
    
    if issues:
        print("❌ CONFIGURATION ISSUES:")
        for issue in issues:
            print(f"   • {issue}")
        print("\n🔧 Fix these issues before using LLM scoring.\n")
        return False
    elif warnings:
        print("⚠️  WARNINGS:")
        for warning in warnings:
            print(f"   • {warning}")
        print("\n✅ Configuration is functional but could be improved.\n")
        return True
    else:
        print("✅ All checks passed! LLM scoring is ready to use.\n")
        return True


def test_api_connectivity(provider, api_key, model):
    """Test actual API connectivity."""
    try:
        if provider == "openai":
            import openai
            client = openai.OpenAI(api_key=api_key)
            
            # Try a minimal completion
            response = client.chat.completions.create(
                model=model or "gpt-4o-mini",
                messages=[{"role": "user", "content": "Say 'OK' if you can read this."}],
                max_tokens=10,
                timeout=5.0
            )
            
            if response.choices[0].message.content:
                print("   ✅ Successfully connected to OpenAI API")
                return True
            else:
                print("   ⚠️  Connected but received unexpected response")
                return False
                
        elif provider == "anthropic":
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            
            # Try a minimal completion
            response = client.messages.create(
                model=model or "claude-3-5-sonnet-20241022",
                max_tokens=10,
                messages=[{"role": "user", "content": "Say 'OK' if you can read this."}],
                timeout=5.0
            )
            
            if response.content[0].text:
                print("   ✅ Successfully connected to Anthropic API")
                return True
            else:
                print("   ⚠️  Connected but received unexpected response")
                return False
                
    except Exception as e:
        print(f"   ❌ Connection test failed: {str(e)[:100]}")
        return False


def print_setup_instructions():
    """Print setup instructions."""
    print("\n" + "=" * 70)
    print("  📚 SETUP INSTRUCTIONS")
    print("=" * 70 + "\n")
    
    print("To enable LLM-enhanced scoring:\n")
    
    print("1️⃣  Install dependencies:")
    print("   pip install openai anthropic")
    print()
    
    print("2️⃣  Configure your .env file:")
    print("   # Enable LLM")
    print("   LLM_ENABLED=true")
    print()
    print("   # For OpenAI:")
    print("   LLM_PROVIDER=openai")
    print("   LLM_API_KEY=sk-your-openai-key-here")
    print("   LLM_MODEL=gpt-4o-mini")
    print()
    print("   # OR for Anthropic:")
    print("   LLM_PROVIDER=anthropic")
    print("   LLM_API_KEY=sk-ant-your-anthropic-key-here")
    print("   LLM_MODEL=claude-3-5-sonnet-20241022")
    print()
    
    print("3️⃣  Get your API key:")
    print("   • OpenAI: https://platform.openai.com/api-keys")
    print("   • Anthropic: https://console.anthropic.com/settings/keys")
    print()
    
    print("4️⃣  Test your setup:")
    print("   python test_llm_scoring.py")
    print()
    
    print("📖 Full guide: See LLM_SETUP.md\n")


if __name__ == "__main__":
    if not os.path.exists(".env"):
        print("\n❌ ERROR: .env file not found!")
        print("   Copy .env.example to .env and configure it.\n")
        sys.exit(1)
    
    is_configured = check_config()
    
    if not is_configured:
        print_setup_instructions()
        sys.exit(1)
    else:
        print("🎉 You're all set! Try running:")
        print("   python test_llm_scoring.py\n")
        sys.exit(0)
