"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileEditor() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true); setNotice(""); setError("");
    const emailChanged = email.trim().toLowerCase() !== user.email?.toLowerCase();
    try {
      // Supabase verifies email changes; never overwrite auth email using admin APIs.
      const { error } = await createBrowserClient().auth.updateUser({
        data: { full_name: name.trim() },
        ...(emailChanged ? { email: email.trim().toLowerCase() } : {}),
      }, { emailRedirectTo: `${window.location.origin}/app/account` });
      if (error) throw error;
      setNotice(emailChanged
        ? "Name saved. Check your current and new email inboxes to confirm the email change. Your sign-in email stays unchanged until confirmation."
        : "Profile updated.");
      setEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your profile. Please try again.");
    } finally { setSaving(false); }
  }

  return <div className="mt-4 border-t border-border/60 pt-4">
    {notice && <p role="status" className="mb-3 text-sm">{notice}</p>}
    {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
    {editing ? <form onSubmit={save} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="profile-name">Full name</Label><Input id="profile-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={100} disabled={saving} /></div>
      <div className="space-y-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} disabled={saving} /></div>
      <div className="flex gap-2"><Button disabled={saving || name.trim().length < 2}>{saving ? "Saving…" : "Save changes"}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button></div>
    </form> : <Button variant="outline" onClick={() => {
      setName(String(user?.user_metadata.full_name ?? "")); setEmail(user?.email ?? ""); setError(""); setEditing(true);
    }}>Edit profile</Button>}
  </div>;
}
