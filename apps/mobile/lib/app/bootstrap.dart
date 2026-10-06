import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../core/config/app_config.dart';
import '../core/config/firebase_options.dart';
import '../core/di/service_locator.dart';
import 'app.dart';

Future<void> bootstrap(AppConfig config) async {
  WidgetsFlutterBinding.ensureInitialized();
  await _initializeFirebase();
  await configureDependencies(config);
  runApp(DosApp(config: config));
}

Future<void> _initializeFirebase() async {
  try {
    if (kIsWeb) {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.web);
      return;
    }

    await Firebase.initializeApp();
  } on Exception catch (error, stackTrace) {
    FlutterError.reportError(
      FlutterErrorDetails(
        exception: error,
        stack: stackTrace,
        library: 'bootstrap',
        context: ErrorDescription('initializing Firebase'),
      ),
    );
  }
}
