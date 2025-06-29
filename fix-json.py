import re
import json

# Read the invalid JSON file
with open('/home/lyzeuph/pearl-moon-server/valid-json.json', 'r') as f:
    content = f.read()

# Fix JavaScript object notation to valid JSON
# Replace unquoted keys with quoted keys
content = re.sub(r'(\w+):', r'"\1":', content)

# Replace single quotes with double quotes
content = content.replace("'", '"')

# Fix array references like [Object] and [Array]
content = re.sub(r'\[Object\]', '{}', content)
content = re.sub(r'\[Array\]', '[]', content)

# Try to parse and reformat
try:
    parsed = json.loads(content)
    formatted = json.dumps(parsed, indent=2)
    
    # Write back to file
    with open('/home/lyzeuph/pearl-moon-server/valid-json.json', 'w') as f:
        f.write(formatted)
    
    print("✅ Successfully converted to valid JSON!")
    
except json.JSONDecodeError as e:
    print(f"❌ Still invalid JSON: {e}")
    print("Manual fixes needed")
