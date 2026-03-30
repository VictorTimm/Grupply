insert into public.hobbies (name) values
  ('Board games'),
  ('Coffee'),
  ('Cooking'),
  ('Cycling'),
  ('Fitness'),
  ('Hiking'),
  ('Movies'),
  ('Music'),
  ('Photography'),
  ('Running'),
  ('Tech'),
  ('Travel'),
  ('Volunteering'),
  ('Yoga')
on conflict (name) do nothing;

