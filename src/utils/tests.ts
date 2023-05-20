export const mongoSnapshotIgnoreFields = {
  _id: expect.any(Object),
  __v: expect.any(Number),
};

export const sanitizeDocuments = (data) => {
  return data.map((d) => {
    return {
      ...d.toObject(),
      _id: undefined,
      __v: undefined,
    };
  });
};
