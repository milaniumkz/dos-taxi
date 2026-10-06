class SendOtpResult {
  const SendOtpResult({required this.expiresInSeconds, this.devCode});

  final int expiresInSeconds;
  final String? devCode;
}
