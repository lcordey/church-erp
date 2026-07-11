-- Local development accounts only. Both users must change their password on first login.
INSERT INTO public.users (
  id,
  username,
  display_name,
  password_hash,
  status,
  must_change_password
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'louange',
    'Louange',
    'scrypt$16384$8$1$UseNzejLzSi7aK70Nbqntw$B3QatI3q4J9cf0jC2zFqysWZud_0i1sGyA0Jqt9vabhlpGnyUxJEguWIxQ_WatdcqyH5sXLfSZS6WBhN2XAIHg',
    'active',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'admin',
    'Administration',
    'scrypt$16384$8$1$a_Dj8uLg9qjtQYqxpBp0lg$cTToNCUQ1C9Yt6b6RtxadolxO7loz1wVbO_QlIGWQ2SIAjw4DxlRWMFjZI649w-cnczQFMO4n4Md3sznrdbWGw',
    'active',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  password_hash = EXCLUDED.password_hash,
  status = EXCLUDED.status,
  must_change_password = EXCLUDED.must_change_password,
  failed_login_count = 0,
  locked_until = NULL,
  updated_at = now();

INSERT INTO public.user_group_memberships (user_id, group_code)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'worship'),
  ('10000000-0000-4000-8000-000000000002', 'worship'),
  ('10000000-0000-4000-8000-000000000002', 'admin')
ON CONFLICT (user_id, group_code) DO NOTHING;
