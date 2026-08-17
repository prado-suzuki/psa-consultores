update public.estrutura_areas
   set page_categories = array_append(page_categories, 'osg')
 where id = 'b0814bc8-1959-4755-8bb1-a44560083791'
   and not ('osg' = any(page_categories));