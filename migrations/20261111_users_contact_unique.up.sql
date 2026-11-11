ALTER TABLE users
    ADD UNIQUE KEY uq_users_mobile (mobile),
    ADD UNIQUE KEY uq_users_email (email);
