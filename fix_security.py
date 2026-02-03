p = '/var/www/gulyaly/lib/security.ts'
with open(p, 'r') as f:
    c = f.read()
target = "'invalid_input'"
if target in c and "'api_error'" not in c:
    c = c.replace(target, target + " | 'api_error'")
    with open(p, 'w') as f:
        f.write(c)
    print("Fixed security.ts")
else:
    print("Already fixed or target not found")
