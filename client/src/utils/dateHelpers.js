import dayjs from 'dayjs';

export const last7Days = () => ({
  startDate: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
});

export const last30Days = () => ({
  startDate: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
});

export const last90Days = () => ({
  startDate: dayjs().subtract(89, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
});

export const toQueryParams = (dateRange) => {
  if (!dateRange || dateRange.length < 2) return {};
  return {
    startDate: dateRange[0]?.format('YYYY-MM-DD'),
    endDate: dateRange[1]?.format('YYYY-MM-DD'),
  };
};
