export const pad = (n: number) => n.toString().padStart(2, '0');
export const dateNoTime = (date: Date) => date.toISOString().slice(0, 10);
export const dateWithTime = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
export const dateOnlyTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
export const dayDifference = (dateA: Date, dateB: Date) => {
  return (
    Math.floor(dateA.valueOf() / 1000 / 60 / 60 / 24) -
    Math.floor(dateB.valueOf() / 1000 / 60 / 60 / 24)
  );
};
