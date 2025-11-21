import {clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';

export const cn = (...inputs: Array<string | undefined | null | Record<string, boolean>>) => twMerge(clsx(inputs));


