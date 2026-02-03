p = '/var/www/gulyaly/app/page.tsx'
with open(p, 'r') as f:
    content = f.read()
# Fix PostgreSQL case sensitivity for all columns
import re
content = re.sub(r'p\.isActive', 'p."isActive"', content)
content = re.sub(r'p\.createdAt', 'p."createdAt"', content)
content = re.sub(r'p\.updatedAt', 'p."updatedAt"', content)
with open(p, 'w') as f:
    f.write(content)
print("Fixed all case sensitivity issues")
