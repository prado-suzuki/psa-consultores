-- Adicionar coluna email ao profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Atualizar trigger para salvar email também
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;

-- Atualizar perfil existente da Mariana
UPDATE public.profiles 
SET first_name = 'Mariana', last_name = '', email = 'mariana@iaplicada.com'
WHERE id = 'd773d29f-ff59-4338-b711-ecd91f4713bf';

-- Atualizar Patricia
UPDATE public.profiles 
SET email = 'patricia.melo@psaconsultores.com.br'
WHERE id = 'fb81a718-124e-45e2-bab5-b0241738c7b7';