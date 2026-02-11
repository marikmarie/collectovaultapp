import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const dateUtils = {
  format: (date: string | Date, format: string = 'MMM DD, YYYY HH:mm') => {
    return dayjs(date).format(format);
  },

  fromNow: (date: string | Date) => {
    return dayjs(date).fromNow();
  },

  toNow: (date: string | Date) => {
    return dayjs(date).toNow();
  },

  isToday: (date: string | Date) => {
    return dayjs(date).isSame(dayjs(), 'day');
  },

  isYesterday: (date: string | Date) => {
    return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day');
  },
};

export default dateUtils;
