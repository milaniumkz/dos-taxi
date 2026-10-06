import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';

class DosCard extends StatelessWidget {
  const DosCard({
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    this.color = AppColors.surface,
    this.radius = 28,
    this.borderColor = AppColors.border,
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final double radius;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 26,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Padding(padding: padding, child: child),
    );
  }
}

class DosPill extends StatelessWidget {
  const DosPill({
    required this.label,
    this.icon,
    this.selected = false,
    this.dark = false,
    this.onTap,
    super.key,
  });

  final String label;
  final IconData? icon;
  final bool selected;
  final bool dark;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = dark ? AppColors.darkText : AppColors.text;
    final muted = dark ? AppColors.darkMuted : AppColors.muted;
    final bg = selected
        ? AppColors.primary
        : dark
        ? AppColors.darkSurfaceAlt
        : AppColors.surfaceAlt;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected ? AppColors.primary : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 16, color: selected ? AppColors.text : muted),
              const SizedBox(width: AppSpacing.xs),
            ],
            Text(
              label,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: selected ? AppColors.text : foreground,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class DosBottomNav extends StatelessWidget {
  const DosBottomNav({
    required this.items,
    required this.selectedIndex,
    this.dark = false,
    super.key,
  });

  final List<DosBottomNavItem> items;
  final int selectedIndex;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return DosCard(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      radius: 26,
      color: dark ? AppColors.darkSurface : AppColors.surface,
      borderColor: dark ? const Color(0x22FFFFFF) : AppColors.border,
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++)
            Expanded(
              child: InkWell(
                onTap: items[i].onTap,
                borderRadius: BorderRadius.circular(18),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        items[i].icon,
                        size: 20,
                        color: i == selectedIndex
                            ? AppColors.primary
                            : dark
                            ? AppColors.darkMuted
                            : const Color(0xFFB4B4B4),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        items[i].label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontSize: 10,
                          color: i == selectedIndex
                              ? AppColors.primary
                              : dark
                              ? AppColors.darkMuted
                              : AppColors.muted,
                          fontWeight: i == selectedIndex
                              ? FontWeight.w800
                              : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class DosBottomNavItem {
  const DosBottomNavItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
}

class DosAvatar extends StatelessWidget {
  const DosAvatar({
    this.initials = 'D',
    this.radius = 28,
    this.dark = false,
    super.key,
  });

  final String initials;
  final double radius;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColors.primary,
      child: Text(
        initials,
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
          color: AppColors.text,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class DosMapOverlay extends StatelessWidget {
  const DosMapOverlay({this.dark = false, super.key});

  final bool dark;

  @override
  Widget build(BuildContext context) {
    return const SizedBox.expand();
  }
}

class DosCarHeroArt extends StatelessWidget {
  const DosCarHeroArt({this.dark = false, super.key});

  final bool dark;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(190, 96),
      painter: _DosCarHeroPainter(dark: dark),
    );
  }
}

class _DosCarHeroPainter extends CustomPainter {
  const _DosCarHeroPainter({required this.dark});

  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    final bodyPaint = Paint()
      ..color = dark ? const Color(0xFF0E1116) : AppColors.primary
      ..style = PaintingStyle.fill;
    final glassPaint = Paint()
      ..color = dark ? const Color(0xFF232A32) : const Color(0xFF20242A)
      ..style = PaintingStyle.fill;
    final lightPaint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.fill;
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.22)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 14);

    final shadow = RRect.fromRectAndRadius(
      Rect.fromLTWH(size.width * 0.1, size.height * 0.62, size.width * 0.8, 22),
      const Radius.circular(40),
    );
    canvas.drawRRect(shadow, shadowPaint);

    final cabin = Path()
      ..moveTo(size.width * 0.28, size.height * 0.54)
      ..quadraticBezierTo(
        size.width * 0.42,
        size.height * 0.18,
        size.width * 0.62,
        size.height * 0.32,
      )
      ..quadraticBezierTo(
        size.width * 0.73,
        size.height * 0.4,
        size.width * 0.79,
        size.height * 0.55,
      )
      ..close();
    canvas.drawPath(cabin, glassPaint);

    final body = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        size.width * 0.12,
        size.height * 0.48,
        size.width * 0.76,
        size.height * 0.3,
      ),
      const Radius.circular(32),
    );
    canvas.drawRRect(body, bodyPaint);

    final hood = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        size.width * 0.17,
        size.height * 0.56,
        size.width * 0.66,
        size.height * 0.15,
      ),
      const Radius.circular(22),
    );
    canvas.drawRRect(
      hood,
      Paint()
        ..color = dark
            ? const Color(0xFF171C22)
            : AppColors.primarySoft.withValues(alpha: 0.58),
    );

    for (final x in [0.27, 0.73]) {
      canvas.drawCircle(
        Offset(size.width * x, size.height * 0.78),
        13,
        Paint()..color = const Color(0xFF111111),
      );
      canvas.drawCircle(
        Offset(size.width * x, size.height * 0.78),
        6,
        Paint()..color = const Color(0xFF3A3A3A),
      );
    }

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * 0.15,
          size.height * 0.58,
          size.width * 0.12,
          8,
        ),
        const Radius.circular(10),
      ),
      lightPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * 0.73,
          size.height * 0.58,
          size.width * 0.12,
          8,
        ),
        const Radius.circular(10),
      ),
      lightPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _DosCarHeroPainter oldDelegate) {
    return oldDelegate.dark != dark;
  }
}
