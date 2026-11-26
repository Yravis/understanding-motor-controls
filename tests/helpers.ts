import { readYaml } from '../scripts/lib/content';
import { paramsFromItems } from '../src/model/params';
import { buildBucket, BucketOptions } from '../src/model/bucket';
export const params = paramsFromItems(readYaml('content/ch01/devices.yaml').items);
export const bucket = (o?: BucketOptions) => buildBucket(params, o);
