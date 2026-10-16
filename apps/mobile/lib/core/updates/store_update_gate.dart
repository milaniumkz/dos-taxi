import 'dart:async';
import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';
import 'store_update_service.dart';

class StoreUpdateGate extends StatefulWidget {
  const StoreUpdateGate({
    required this.child,
    required this.check,
    required this.open,
    super.key,
  });
  final Widget child;
  final Future<RequiredStoreUpdate?> Function() check;
  final Future<bool> Function(RequiredStoreUpdate) open;
  @override
  State<StoreUpdateGate> createState() => _StoreUpdateGateState();
}

class _StoreUpdateGateState extends State<StoreUpdateGate>
    with WidgetsBindingObserver {
  RequiredStoreUpdate? _required;
  bool _checking = true, _opening = false, _running = false;
  String? _error;
  Timer? _timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_check());
    _timer = Timer.periodic(const Duration(minutes: 5), (_) => _check());
  }

  Future<void> _check() async {
    if (_running) return;
    _running = true;
    try {
      final result = await widget.check();
      if (mounted) {
        setState(() {
          _required = result;
          _checking = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _checking = false);
    } finally {
      _running = false;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_check());
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_required == null) return widget.child;
    final l = AppLocalizations.of(context)!;
    return PopScope(
      canPop: false,
      child: Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.system_update, size: 64),
                  const SizedBox(height: 20),
                  Text(
                    l.requiredUpdateTitle,
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(l.requiredUpdateBody, textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _opening
                        ? null
                        : () async {
                            setState(() {
                              _opening = true;
                              _error = null;
                            });
                            try {
                              final opened = await widget.open(_required!);
                              if (mounted && !opened) {
                                setState(
                                  () => _error = l.requiredUpdateOpenError,
                                );
                              }
                              await _check();
                            } catch (_) {
                              if (mounted) {
                                setState(
                                  () => _error = l.requiredUpdateOpenError,
                                );
                              }
                            } finally {
                              if (mounted) setState(() => _opening = false);
                            }
                          },
                    child: Text(l.requiredUpdateAction),
                  ),
                  TextButton(
                    onPressed: _check,
                    child: Text(l.requiredUpdateRetry),
                  ),
                  if (_error != null)
                    Text(_error!, textAlign: TextAlign.center),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
