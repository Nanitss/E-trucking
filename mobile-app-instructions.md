# 📱 Mobile Driver App Development Instructions

## 🎯 **Project Overview**
Create a **Flutter mobile application** for truck drivers to:
- Login and manage their profile
- Receive delivery assignments via push notifications
- Navigate routes with real-time GPS tracking
- Update delivery status and capture proof of delivery
- Track earnings and delivery history

---

## 🏗️ **Project Setup Instructions**

### 1. Create Flutter Project
```bash
flutter create trucking_driver_app
cd trucking_driver_app
```

### 2. Add Dependencies to `pubspec.yaml`
```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP & API
  dio: ^5.3.2
  retrofit: ^4.0.3
  json_annotation: ^4.8.1
  
  # State Management
  bloc: ^8.1.2
  flutter_bloc: ^8.1.3
  
  # Local Storage
  shared_preferences: ^2.2.2
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  
  # Navigation
  go_router: ^12.1.1
  
  # Maps & Location
  google_maps_flutter: ^2.5.0
  location: ^5.0.3
  geolocator: ^10.1.0
  geocoding: ^2.1.1
  
  # Push Notifications
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
  flutter_local_notifications: ^16.3.0
  
  # Image & Camera
  image_picker: ^1.0.4
  camera: ^0.10.5+5
  
  # Signature
  signature: ^5.4.0
  
  # Permissions
  permission_handler: ^11.1.0
  
  # UI Components
  cupertino_icons: ^1.0.2
  flutter_svg: ^2.0.7
  cached_network_image: ^3.3.0
  shimmer: ^3.0.0
  
  # Utils
  intl: ^0.18.1
  uuid: ^4.2.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  
  # Code Generation
  build_runner: ^2.4.7
  retrofit_generator: ^8.0.4
  json_serializable: ^6.7.1
  hive_generator: ^2.0.1
```

### 3. Configure Firebase
1. **Add your app to Firebase Console**
2. **Download `google-services.json`** (Android) and `GoogleService-Info.plist`** (iOS)
3. **Place files in correct directories:**
   - Android: `android/app/google-services.json`
   - iOS: `ios/Runner/GoogleService-Info.plist`

### 4. Configure Android (`android/app/build.gradle`)
```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        minSdkVersion 23
        targetSdkVersion 34
    }
}

dependencies {
    implementation 'com.google.android.gms:play-services-maps:18.2.0'
    implementation 'com.google.android.gms:play-services-location:21.0.1'
}
```

### 5. Add Permissions (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />

<application>
    <meta-data android:name="com.google.android.geo.API_KEY"
               android:value="YOUR_GOOGLE_MAPS_API_KEY"/>
</application>
```

---

## 📁 **Project Structure**

Create this folder structure:
```
lib/
├── main.dart
├── app/
│   ├── app.dart
│   └── router.dart
├── core/
│   ├── api/
│   │   ├── api_client.dart
│   │   ├── api_service.dart
│   │   └── interceptors/
│   ├── constants/
│   │   ├── api_constants.dart
│   │   ├── app_constants.dart
│   │   └── storage_keys.dart
│   ├── services/
│   │   ├── auth_service.dart
│   │   ├── location_service.dart
│   │   ├── notification_service.dart
│   │   └── storage_service.dart
│   ├── utils/
│   │   ├── validators.dart
│   │   ├── helpers.dart
│   │   └── extensions.dart
│   └── themes/
│       ├── app_theme.dart
│       └── colors.dart
├── features/
│   ├── auth/
│   │   ├── data/
│   │   ├── domain/
│   │   ├── presentation/
│   │   └── bloc/
│   ├── home/
│   ├── deliveries/
│   ├── profile/
│   ├── earnings/
│   └── maps/
├── shared/
│   ├── widgets/
│   └── models/
└── generated/
```

---

## 🔧 **Core Implementation**

### 1. API Configuration (`lib/core/constants/api_constants.dart`)
```dart
class ApiConstants {
  // Replace with your server URL
  static const String baseUrl = 'http://your-server-domain.com/api/mobile';
  static const String localUrl = 'http://localhost:5007/api/mobile';
  
  // Use local for development, baseUrl for production
  static const String apiUrl = localUrl;
  
  // Endpoints
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String refreshToken = '/auth/refresh';
  static const String registerDevice = '/auth/register-device';
  
  static const String profile = '/driver/profile';
  static const String updateLocation = '/driver/location';
  static const String updateStatus = '/driver/status';
  
  static const String assignedDeliveries = '/deliveries/assigned';
  static const String deliveryHistory = '/driver/delivery-history';
  static const String earnings = '/driver/earnings';
  
  static const String notifications = '/notifications';
}
```

### 2. API Client (`lib/core/api/api_client.dart`)
```dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import 'package:json_annotation/json_annotation.dart';

part 'api_client.g.dart';

@RestApi()
abstract class ApiClient {
  factory ApiClient(Dio dio, {String? baseUrl}) = _ApiClient;

  // Auth endpoints
  @POST('/auth/login')
  Future<LoginResponse> login(@Body() LoginRequest request);
  
  @POST('/auth/logout')
  Future<ApiResponse> logout();
  
  @POST('/auth/refresh')
  Future<TokenResponse> refreshToken();
  
  @POST('/auth/register-device')
  Future<ApiResponse> registerDevice(@Body() DeviceRegistration device);

  // Driver endpoints
  @GET('/driver/profile')
  Future<DriverProfileResponse> getProfile();
  
  @PUT('/driver/profile')
  Future<ApiResponse> updateProfile(@Body() UpdateProfileRequest request);
  
  @POST('/driver/location')
  Future<ApiResponse> updateLocation(@Body() LocationUpdate location);
  
  @PUT('/driver/status')
  Future<ApiResponse> updateStatus(@Body() StatusUpdate status);

  // Delivery endpoints
  @GET('/deliveries/assigned')
  Future<AssignedDeliveriesResponse> getAssignedDeliveries();
  
  @POST('/deliveries/{id}/accept')
  Future<ApiResponse> acceptDelivery(@Path('id') String assignmentId);
  
  @POST('/deliveries/{id}/start')
  Future<ApiResponse> startDelivery(@Path('id') String assignmentId);
  
  @POST('/deliveries/{id}/complete')
  Future<ApiResponse> completeDelivery(
    @Path('id') String assignmentId, 
    @Body() CompleteDeliveryRequest request
  );
  
  @GET('/deliveries/{id}/route')
  Future<RouteDetailsResponse> getRouteDetails(@Path('id') String deliveryId);

  // History & Analytics
  @GET('/driver/delivery-history')
  Future<DeliveryHistoryResponse> getDeliveryHistory(
    @Query('limit') int? limit,
    @Query('status') String? status,
  );
  
  @GET('/driver/earnings')
  Future<EarningsResponse> getEarnings(
    @Query('period') String? period,
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  );

  // Notifications
  @GET('/notifications')
  Future<NotificationsResponse> getNotifications(@Query('limit') int? limit);
  
  @PUT('/notifications/{id}/read')
  Future<ApiResponse> markNotificationAsRead(@Path('id') String notificationId);
}
```

### 3. Models (`lib/shared/models/`)

Create these model files:

**auth_models.dart:**
```dart
import 'package:json_annotation/json_annotation.dart';

part 'auth_models.g.dart';

@JsonSerializable()
class LoginRequest {
  final String username;
  final String password;
  final String? deviceToken;
  final DeviceInfo? deviceInfo;

  LoginRequest({
    required this.username,
    required this.password,
    this.deviceToken,
    this.deviceInfo,
  });

  factory LoginRequest.fromJson(Map<String, dynamic> json) => 
      _$LoginRequestFromJson(json);
  Map<String, dynamic> toJson() => _$LoginRequestToJson(this);
}

@JsonSerializable()
class LoginResponse {
  final bool success;
  final String token;
  final DriverInfo driver;
  final String message;

  LoginResponse({
    required this.success,
    required this.token,
    required this.driver,
    required this.message,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) => 
      _$LoginResponseFromJson(json);
  Map<String, dynamic> toJson() => _$LoginResponseToJson(this);
}

@JsonSerializable()
class DriverInfo {
  final String id;
  final String name;
  final String username;
  final String phone;
  final String status;

  DriverInfo({
    required this.id,
    required this.name,
    required this.username,
    required this.phone,
    required this.status,
  });

  factory DriverInfo.fromJson(Map<String, dynamic> json) => 
      _$DriverInfoFromJson(json);
  Map<String, dynamic> toJson() => _$DriverInfoToJson(this);
}
```

**delivery_models.dart:**
```dart
import 'package:json_annotation/json_annotation.dart';

part 'delivery_models.g.dart';

@JsonSerializable()
class Delivery {
  final String id;
  @JsonKey(name: 'DeliveryID')
  final String deliveryID;
  @JsonKey(name: 'PickupLocation')
  final String pickupLocation;
  @JsonKey(name: 'DropoffLocation')
  final String dropoffLocation;
  @JsonKey(name: 'PickupCoordinates')
  final Coordinates pickupCoordinates;
  @JsonKey(name: 'DropoffCoordinates')
  final Coordinates dropoffCoordinates;
  @JsonKey(name: 'DeliveryDistance')
  final double distance;
  @JsonKey(name: 'EstimatedDuration')
  final int estimatedDuration;
  @JsonKey(name: 'CargoWeight')
  final double cargoWeight;
  @JsonKey(name: 'DeliveryRate')
  final double rate;
  @JsonKey(name: 'DeliveryStatus')
  final String status;
  @JsonKey(name: 'DeliveryDate')
  final String deliveryDate;

  Delivery({
    required this.id,
    required this.deliveryID,
    required this.pickupLocation,
    required this.dropoffLocation,
    required this.pickupCoordinates,
    required this.dropoffCoordinates,
    required this.distance,
    required this.estimatedDuration,
    required this.cargoWeight,
    required this.rate,
    required this.status,
    required this.deliveryDate,
  });

  factory Delivery.fromJson(Map<String, dynamic> json) => 
      _$DeliveryFromJson(json);
  Map<String, dynamic> toJson() => _$DeliveryToJson(this);
}

@JsonSerializable()
class Coordinates {
  final double lat;
  final double lng;

  Coordinates({required this.lat, required this.lng});

  factory Coordinates.fromJson(Map<String, dynamic> json) => 
      _$CoordinatesFromJson(json);
  Map<String, dynamic> toJson() => _$CoordinatesToJson(this);
}
```

### 4. Authentication Service (`lib/core/services/auth_service.dart`)
```dart
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../../shared/models/auth_models.dart';

class AuthService {
  static const String _tokenKey = 'auth_token';
  static const String _driverKey = 'driver_info';
  
  final ApiClient _apiClient;
  final SharedPreferences _prefs;

  AuthService(this._apiClient, this._prefs);

  Future<LoginResponse> login(String username, String password) async {
    final request = LoginRequest(
      username: username,
      password: password,
      deviceToken: await _getDeviceToken(),
      deviceInfo: await _getDeviceInfo(),
    );

    final response = await _apiClient.login(request);
    
    if (response.success) {
      await _saveToken(response.token);
      await _saveDriverInfo(response.driver);
    }
    
    return response;
  }

  Future<void> logout() async {
    try {
      await _apiClient.logout();
    } catch (e) {
      // Continue with local logout even if API call fails
      print('Logout API call failed: $e');
    }
    
    await _clearTokens();
  }

  Future<String?> getToken() async {
    return _prefs.getString(_tokenKey);
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<DriverInfo?> getDriverInfo() async {
    final driverJson = _prefs.getString(_driverKey);
    if (driverJson != null) {
      return DriverInfo.fromJson(json.decode(driverJson));
    }
    return null;
  }

  Future<void> _saveToken(String token) async {
    await _prefs.setString(_tokenKey, token);
  }

  Future<void> _saveDriverInfo(DriverInfo driver) async {
    await _prefs.setString(_driverKey, json.encode(driver.toJson()));
  }

  Future<void> _clearTokens() async {
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_driverKey);
  }

  Future<String?> _getDeviceToken() async {
    // Implement Firebase Messaging token retrieval
    return null; // Placeholder
  }

  Future<DeviceInfo> _getDeviceInfo() async {
    // Return device information
    return DeviceInfo(
      platform: Platform.isAndroid ? 'android' : 'ios',
      version: '1.0.0',
      deviceId: 'unique_device_id',
    );
  }
}
```

### 5. Location Service (`lib/core/services/location_service.dart`)
```dart
import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import '../api/api_client.dart';
import '../../shared/models/common_models.dart';

class LocationService {
  final ApiClient _apiClient;
  StreamSubscription<Position>? _positionStream;
  Timer? _locationUpdateTimer;

  LocationService(this._apiClient);

  Future<bool> requestLocationPermission() async {
    final status = await Permission.location.request();
    return status == PermissionStatus.granted;
  }

  Future<Position?> getCurrentLocation() async {
    try {
      final hasPermission = await requestLocationPermission();
      if (!hasPermission) return null;

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      print('Error getting location: $e');
      return null;
    }
  }

  void startLocationTracking() {
    _locationUpdateTimer = Timer.periodic(
      const Duration(seconds: 30), // Update every 30 seconds
      (timer) async {
        final position = await getCurrentLocation();
        if (position != null) {
          await _updateLocationOnServer(position);
        }
      },
    );
  }

  void stopLocationTracking() {
    _locationUpdateTimer?.cancel();
    _positionStream?.cancel();
  }

  Future<void> _updateLocationOnServer(Position position) async {
    try {
      final locationUpdate = LocationUpdate(
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy,
        speed: position.speed,
      );

      await _apiClient.updateLocation(locationUpdate);
    } catch (e) {
      print('Error updating location on server: $e');
    }
  }
}
```

### 6. Push Notification Service (`lib/core/services/notification_service.dart`)
```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = 
      FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    // Request permission
    await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Initialize local notifications
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(initSettings);

    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle notification taps
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
  }

  Future<String?> getDeviceToken() async {
    return await _firebaseMessaging.getToken();
  }

  static Future<void> _handleBackgroundMessage(RemoteMessage message) async {
    print('Background message: ${message.messageId}');
  }

  void _handleForegroundMessage(RemoteMessage message) {
    _showLocalNotification(
      message.notification?.title ?? 'New Notification',
      message.notification?.body ?? '',
      message.data,
    );
  }

  void _handleNotificationTap(RemoteMessage message) {
    // Handle navigation based on notification data
    final data = message.data;
    if (data['type'] == 'new_delivery') {
      // Navigate to delivery details
    }
  }

  Future<void> _showLocalNotification(
    String title,
    String body,
    Map<String, dynamic> data,
  ) async {
    const androidDetails = AndroidNotificationDetails(
      'delivery_notifications',
      'Delivery Notifications',
      importance: Importance.high,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails();
    
    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      0,
      title,
      body,
      notificationDetails,
    );
  }
}
```

---

## 🎨 **UI Implementation**

### 1. Main App (`lib/main.dart`)
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_core/firebase_core.dart';
import 'app/app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  runApp(const TruckingDriverApp());
}
```

### 2. App Configuration (`lib/app/app.dart`)
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../core/themes/app_theme.dart';
import '../features/auth/bloc/auth_bloc.dart';
import 'router.dart';

class TruckingDriverApp extends StatelessWidget {
  const TruckingDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (context) => AuthBloc()..add(CheckAuthStatus())),
        // Add other blocs here
      ],
      child: MaterialApp.router(
        title: 'Trucking Driver',
        theme: AppTheme.lightTheme,
        routerConfig: AppRouter.router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
```

### 3. Login Screen (`lib/features/auth/presentation/login_screen.dart`)
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/auth_bloc.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthSuccess) {
            // Navigate to home
            context.go('/home');
          } else if (state is AuthFailure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error)),
            );
          }
        },
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo
                  Icon(
                    Icons.local_shipping,
                    size: 80,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(height: 24),
                  
                  // Title
                  Text(
                    'Driver Login',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 32),
                  
                  // Username Field
                  TextFormField(
                    controller: _usernameController,
                    decoration: const InputDecoration(
                      labelText: 'Username',
                      prefixIcon: Icon(Icons.person),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your username';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  
                  // Password Field
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your password';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 32),
                  
                  // Login Button
                  BlocBuilder<AuthBloc, AuthState>(
                    builder: (context, state) {
                      return SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: state is AuthLoading ? null : _login,
                          child: state is AuthLoading
                              ? const CircularProgressIndicator()
                              : const Text('Login'),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _login() {
    if (_formKey.currentState!.validate()) {
      context.read<AuthBloc>().add(
            LoginRequested(
              username: _usernameController.text,
              password: _passwordController.text,
            ),
          );
    }
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
```

---

## 🔄 **State Management (BLoC)**

### 1. Auth BLoC (`lib/features/auth/bloc/auth_bloc.dart`)
```dart
import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/services/auth_service.dart';
import '../../../shared/models/auth_models.dart';

// Events
abstract class AuthEvent extends Equatable {
  @override
  List<Object> get props => [];
}

class CheckAuthStatus extends AuthEvent {}

class LoginRequested extends AuthEvent {
  final String username;
  final String password;

  LoginRequested({required this.username, required this.password});

  @override
  List<Object> get props => [username, password];
}

class LogoutRequested extends AuthEvent {}

// States
abstract class AuthState extends Equatable {
  @override
  List<Object> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthSuccess extends AuthState {
  final DriverInfo driver;

  AuthSuccess({required this.driver});

  @override
  List<Object> get props => [driver];
}

class AuthFailure extends AuthState {
  final String error;

  AuthFailure({required this.error});

  @override
  List<Object> get props => [error];
}

class AuthUnauthenticated extends AuthState {}

// BLoC
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthService _authService;

  AuthBloc(this._authService) : super(AuthInitial()) {
    on<CheckAuthStatus>(_onCheckAuthStatus);
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onCheckAuthStatus(
    CheckAuthStatus event,
    Emitter<AuthState> emit,
  ) async {
    final isLoggedIn = await _authService.isLoggedIn();
    if (isLoggedIn) {
      final driver = await _authService.getDriverInfo();
      if (driver != null) {
        emit(AuthSuccess(driver: driver));
      } else {
        emit(AuthUnauthenticated());
      }
    } else {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    try {
      final response = await _authService.login(event.username, event.password);
      emit(AuthSuccess(driver: response.driver));
    } catch (e) {
      emit(AuthFailure(error: e.toString()));
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    await _authService.logout();
    emit(AuthUnauthenticated());
  }
}
```

---

## 📲 **Key Features Implementation**

### 1. **Maps Integration** (Google Maps)
- Display route from pickup to dropoff
- Real-time driver location tracking
- Turn-by-turn navigation integration

### 2. **Photo Capture**
- Before/after delivery photos
- Damage documentation
- Signature capture for proof of delivery

### 3. **Offline Support**
- Cache delivery data locally
- Queue location updates when offline
- Sync when connection restored

### 4. **Push Notifications**
- New delivery assignments
- Route updates
- Emergency alerts

---

## 🚀 **Deployment Steps**

### 1. **Android Build**
```bash
flutter build apk --release
flutter build appbundle --release
```

### 2. **iOS Build**
```bash
flutter build ios --release
```

### 3. **Testing**
- Test on physical devices
- Test location services
- Test notification delivery
- Test offline functionality

---

## ⚙️ **Configuration Checklist**

- [ ] Replace `YOUR_SERVER_DOMAIN` with actual server URL
- [ ] Add Google Maps API key
- [ ] Configure Firebase project
- [ ] Set up push notification certificates
- [ ] Test all API endpoints
- [ ] Configure app permissions
- [ ] Set up code signing (iOS)
- [ ] Test on both Android and iOS

---

## 📞 **API Integration**

Your web application server is running at `http://localhost:5007/api/mobile` with these endpoints ready:

✅ **Authentication:** Login, logout, token refresh
✅ **Delivery Management:** Get assignments, update status
✅ **Location Tracking:** Real-time location updates  
✅ **Notifications:** Push notifications via Firebase
✅ **Photo Upload:** Delivery proof images
✅ **Earnings:** Driver statistics and earnings

The mobile app should connect seamlessly to your existing backend infrastructure! 