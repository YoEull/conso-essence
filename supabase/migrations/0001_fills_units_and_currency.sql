-- Make each fill self-describing: store exactly what was entered (value +
-- the unit/currency it was entered in), rather than converting to a
-- canonical unit. Single source of truth, no conversion math on write.

alter table fills rename column liters to volume;
alter table fills rename column mileage to odometer;
alter table fills rename column price_per_liter to price_per_unit;

alter table fills add column volume_unit text not null default 'L'
  check (volume_unit in ('L', 'gal_us', 'gal_uk'));

alter table fills add column distance_unit text not null default 'km'
  check (distance_unit in ('km', 'mi'));

alter table fills add column currency text not null default 'EUR'
  check (currency in ('EUR', 'USD', 'GBP', 'JPY', 'CNY', 'CAD', 'INR', 'KRW', 'CHF', 'AUD'));
