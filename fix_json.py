p = '/var/www/gulyaly/app/page.tsx'
with open(p, 'r') as f:
    content = f.read()
# Replace json_object with json_build_object
content = content.replace('json_object(', 'json_build_object(')
with open(p, 'w') as f:
    f.write(content)
print("Fixed JSON function")
