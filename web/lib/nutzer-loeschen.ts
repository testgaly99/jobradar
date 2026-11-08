import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { loescheNutzerMit } from "@/lib/nutzer-loeschen-kern";

export const loescheNutzer = (uid: string): Promise<void> => loescheNutzerMit(createAdminClient(), uid);
