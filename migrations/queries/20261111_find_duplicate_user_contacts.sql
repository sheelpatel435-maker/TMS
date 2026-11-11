WITH normalized_users AS (
    SELECT
        id,
        mobile,
        email,
        REGEXP_REPLACE(
            REGEXP_REPLACE(TRIM(mobile), '[[:space:]-]', ''),
            '^[+]91',
            ''
        ) AS normalized_mobile,
        LOWER(TRIM(email)) AS normalized_email
    FROM users
)
SELECT
    'mobile' AS duplicate_type,
    normalized_mobile AS duplicate_value,
    GROUP_CONCAT(id ORDER BY id) AS user_ids,
    COUNT(*) AS duplicate_count
FROM normalized_users
WHERE mobile IS NOT NULL
GROUP BY normalized_mobile
HAVING COUNT(*) > 1

UNION ALL

SELECT
    'email' AS duplicate_type,
    normalized_email AS duplicate_value,
    GROUP_CONCAT(id ORDER BY id) AS user_ids,
    COUNT(*) AS duplicate_count
FROM normalized_users
WHERE email IS NOT NULL
GROUP BY normalized_email
HAVING COUNT(*) > 1;
