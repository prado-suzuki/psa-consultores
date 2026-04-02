-- Disable user triggers
ALTER TABLE per DISABLE TRIGGER USER;

-- Drop FK constraints temporarily
ALTER TABLE per_situacao DROP CONSTRAINT IF EXISTS per_situacao_nr_proc_per_fkey;
ALTER TABLE dcomp DROP CONSTRAINT IF EXISTS dcomp_nr_per_orig_fkey;
ALTER TABLE dcomp DROP CONSTRAINT IF EXISTS dcomp_nr_dcomp_ret_fkey;
ALTER TABLE per DROP CONSTRAINT IF EXISTS per_nr_proc_ret_fkey;

-- Clean all columns
UPDATE per SET nr_per = regexp_replace(nr_per, '\D', '', 'g') WHERE nr_per ~ '\D';
UPDATE per SET nr_proc_ret = regexp_replace(nr_proc_ret, '\D', '', 'g') WHERE nr_proc_ret IS NOT NULL AND nr_proc_ret ~ '\D';
UPDATE per_situacao SET nr_proc_per = regexp_replace(nr_proc_per, '\D', '', 'g') WHERE nr_proc_per ~ '\D';
UPDATE dcomp SET nr_per_orig = regexp_replace(nr_per_orig, '\D', '', 'g') WHERE nr_per_orig ~ '\D';
UPDATE dcomp SET nr_dcomp_ret = regexp_replace(nr_dcomp_ret, '\D', '', 'g') WHERE nr_dcomp_ret IS NOT NULL AND nr_dcomp_ret ~ '\D';
UPDATE dcomp SET nr_documento = regexp_replace(nr_documento, '\D', '', 'g') WHERE nr_documento ~ '\D';

-- Re-create FK constraints
ALTER TABLE per_situacao ADD CONSTRAINT per_situacao_nr_proc_per_fkey FOREIGN KEY (nr_proc_per) REFERENCES per(nr_per);
ALTER TABLE dcomp ADD CONSTRAINT dcomp_nr_per_orig_fkey FOREIGN KEY (nr_per_orig) REFERENCES per(nr_per);
ALTER TABLE dcomp ADD CONSTRAINT dcomp_nr_dcomp_ret_fkey FOREIGN KEY (nr_dcomp_ret) REFERENCES dcomp(nr_documento);
ALTER TABLE per ADD CONSTRAINT per_nr_proc_ret_fkey FOREIGN KEY (nr_proc_ret) REFERENCES per(nr_per);

-- Re-enable user triggers
ALTER TABLE per ENABLE TRIGGER USER;