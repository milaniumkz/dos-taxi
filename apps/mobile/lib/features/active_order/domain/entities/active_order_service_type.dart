enum ActiveOrderServiceType { taxi, intercity, delivery }

extension ActiveOrderServiceTypeX on ActiveOrderServiceType {
  String get apiValue {
    switch (this) {
      case ActiveOrderServiceType.taxi:
        return 'taxi';
      case ActiveOrderServiceType.intercity:
        return 'intercity';
      case ActiveOrderServiceType.delivery:
        return 'delivery';
    }
  }
}
