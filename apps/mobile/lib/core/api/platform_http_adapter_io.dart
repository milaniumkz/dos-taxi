import 'dart:io';

import 'package:dio/dio.dart';
import 'package:native_dio_adapter/native_dio_adapter.dart';

HttpClientAdapter? createPlatformHttpAdapter() {
  // URLSession handles system proxies and IPv4 literals on DNS64/NAT64 networks.
  return Platform.isIOS ? NativeAdapter() : null;
}
