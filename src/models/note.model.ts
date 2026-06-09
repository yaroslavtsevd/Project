export interface NoteEntity {
  id: number;
  ownerUserId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
