export const mongoSnapshotIgnoreFields = {
  _id: expect.any(Object),
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date),
};