p = '/var/www/gulyaly/app/page.tsx'
with open(p, 'r') as f:
    content = f.read()
# Fix PostgreSQL case sensitivity
content = content.replace('pv.productId', 'pv."productId"')
content = content.replace('pv.createdAt', 'pv."createdAt"')
content = content.replace('pv.updatedAt', 'pv."updatedAt"')
with open(p, 'w') as f:
    f.write(content)
print("Fixed case sensitivity issues")
