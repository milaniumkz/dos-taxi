import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'ride_poll_cubit.dart';

class RidePollLifecycle extends StatefulWidget {
  const RidePollLifecycle({super.key, required this.child});
  final Widget child;
  @override
  State<RidePollLifecycle> createState() => _RidePollLifecycleState();
}

class _RidePollLifecycleState extends State<RidePollLifecycle>
    with WidgetsBindingObserver {
  late final RidePollCubit cubit;
  @override
  void initState() {
    super.initState();
    cubit = context.read<RidePollCubit>();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      cubit.start();
    } else {
      cubit.pause();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    cubit.pause();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
