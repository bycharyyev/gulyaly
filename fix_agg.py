p = '/var/www/gulyaly/app/page.tsx'
with open(p, 'r') as f:
    content = f.read()
# Replace SQLite functions with PostgreSQL equivalents
content = content.replace('json_group_array(', 'json_agg(')
with open(p, 'w') as f:
    f.write(content)
print("Fixed JSON aggregate function")
