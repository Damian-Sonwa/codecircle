import {PipelineStage} from 'mongoose';

export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor?: string;
}

export const buildCursorPipeline = (
  limit: number,
  cursor?: string
): PipelineStage[] => {
  const stages: PipelineStage[] = [];

  if (cursor) {
    stages.push({
      $match: {
        _id: {$lt: cursor}
      }
    });
  }

  stages.push({$sort: {_id: -1}}, {$limit: limit + 1});
  return stages;
};

export const extractCursor = <T extends {_id: string}>(docs: T[], limit: number): CursorPaginatedResult<T> => {
  let nextCursor: string | undefined;
  if (docs.length > limit) {
    const next = docs.pop();
    nextCursor = next?._id;
  }

  return {
    data: docs,
    nextCursor
  };
};


