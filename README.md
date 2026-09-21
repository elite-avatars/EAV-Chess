# EAV Chess

EAV Chess is an Elite Avatars multiplayer chess and learning platform.

## Beta features
- Supabase email/password player accounts
- Player profiles and starting rating
- Private invite-code games
- Server-side legal move and turn validation via Supabase Edge Function
- Move history and opponent-state refresh
- 22 original lesson tracks based on standard chess subject areas
- Lesson completion tracking
- Video lesson library slots

## Curriculum reference
The user-provided tables of contents for *Chess Openings For Dummies, 2nd Edition* and *Chess Master vs. Chess Amateur* are used as curriculum topic maps. EAV lesson text is original and does not reproduce copyrighted source-book text.

## Backend
Uses the existing EAV Supabase project with isolated `chess_*` tables and Row Level Security.
