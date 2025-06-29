#!/usr/bin/env python3
import re
import json

def fix_json_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Step 1: Fix unquoted property names - be more careful with patterns
    # Match word characters followed by colon, but not inside strings
    def quote_keys(match):
        key = match.group(1)
        # Don't quote if it's already quoted or if it's a value
        if key.startswith('"') or key.startswith("'"):
            return match.group(0)
        return f'"{key}":'
    
    # Replace unquoted keys - simpler approach
    content = re.sub(r'^(\s*)(\w+):', r'\1"\2":', content, flags=re.MULTILINE)
    content = re.sub(r'([,{]\s*)(\w+):', r'\1"\2":', content)
    
    # Step 2: Replace single quotes with double quotes (but be careful about apostrophes)
    content = re.sub(r"'([^']*)'", r'"\1"', content)
    
    # Step 3: Fix common JavaScript object issues
    content = re.sub(r'\[Object\]', '{}', content)
    content = re.sub(r'\[Array\]', '[]', content)
    
    # Step 4: Fix missing quotes around some known problematic patterns
    content = re.sub(r'(\w+):\s*{', r'"\1": {', content)
    
    try:
        # Test if it's valid JSON now
        parsed = json.loads(content)
        
        # Write formatted JSON back
        with open(file_path, 'w') as f:
            json.dump(parsed, f, indent=2)
        
        print(f"✅ Successfully converted {file_path} to valid JSON!")
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Still invalid JSON: {e}")
        print("Content preview around error:")
        lines = content.split('\n')
        if hasattr(e, 'lineno') and e.lineno:
            start = max(0, e.lineno - 3)
            end = min(len(lines), e.lineno + 2)
            for i in range(start, end):
                marker = " >> " if i == e.lineno - 1 else "    "
                print(f"{marker}{i+1:3}: {lines[i]}")
        return False

if __name__ == "__main__":
    fix_json_file('/home/lyzeuph/pearl-moon-server/valid-json.json')
