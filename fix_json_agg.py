import re
p = '/var/www/gulyaly/app/page.tsx'
with open(p, 'r') as f:
    content = f.read()

# Replace raw SQL query with proper PostgreSQL COALESCE to handle empty arrays
old_query = """  const products = await prisma.$queryRawUnsafe(`
    SELECT p.*,
           json_agg(
             json_build_object(
               'id', pv.id,
               'productId', pv."productId",
               'name', pv.name,
               'price', pv.price,
               'description', pv.description,
               'createdAt', pv."createdAt",
               'updatedAt', pv."updatedAt"
             )
           ) as variants
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv."productId"
    WHERE p."isActive" = true
    GROUP BY p.id
    ORDER BY p."createdAt" DESC
  `) as any[];"""

new_query = """  const products = await prisma.$queryRawUnsafe(`
    SELECT p.*,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', pv.id,
                 'productId', pv."productId",
                 'name', pv.name,
                 'price', pv.price,
                 'description', pv.description,
                 'createdAt', pv."createdAt",
                 'updatedAt', pv."updatedAt"
               ) ORDER BY pv.id
             ) FILTER (WHERE pv.id IS NOT NULL),
             '[]'::json
           ) as variants
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv."productId"
    WHERE p."isActive" = true
    GROUP BY p.id
    ORDER BY p."createdAt" DESC
  `) as any[];"""

content = content.replace(old_query, new_query)

with open(p, 'w') as f:
    f.write(content)
print("Fixed JSON aggregation")
