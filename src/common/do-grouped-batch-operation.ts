/**
 * @param data The data to process.
 * @param callback The function to process each object.
 * @param groupSize The count of objects to process each time.
 */
export async function doGroupedBatchOperation<Data>(
  data: Data[],
  callback: (object: Data) => Promise<void>,
  groupSize: number
) {
  for (let i = 0; i < data.length; i += groupSize) await Promise.all(data.slice(i, i + groupSize).map(callback));
}
