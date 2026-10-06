enum CourierVehicleType {
  bicycle('bicycle'),
  moped('moped'),
  scooter('scooter'),
  car('car');

  const CourierVehicleType(this.apiValue);

  final String apiValue;
}
