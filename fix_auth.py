p = '/var/www/gulyaly/lib/auth-broken.ts'
with open(p, 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Fix the missing return/undefined issue by adding explicit returns
    if 'return {' in line:
        new_lines.append(line.replace('return {', 'return ({') + ' as any)')
    else:
        new_lines.append(line)

with open(p, 'w') as f:
    f.writelines(new_lines)
