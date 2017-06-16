load('api_config.js');
load('api_gpio.js');
load('api_timer.js');
load('api_http.js');

//replace the links in the quotes
let smokeUrl = 'http://YOUR SMOKE URL';
let batteryLowUrl = 'http://YOUR BATTERY LOW URL';

//some millisecond settings. adjust to your needs
let millisToWaitFirst = 1000;
let millisToWaitAfterSmokeCall = 60000;
let millisToTestForBeeps = 5000;
let millisToWaitForReconnect = 3000;

let LED = ffi('int get_led_gpio_pin()')();

let testing = false;
//ohoh indicates if it is still beeping
let ohoh = false;
//pin definitions
let D1 = 5;
let D2 = 4;

//using D2 as pull up input. The smokedetector input low will pull it down unless its high as well
GPIO.set_mode(D2, GPIO.MODE_INPUT);
GPIO.set_pull(D2, GPIO.PULL_UP);
//detecting if G2 changes
GPIO.set_int_handler(D2, GPIO.INT_EDGE_NEG, function(pin) {
   if(ohoh || !testing) return;
   print('Beeped again');
   Timer.del(tid);
   GPIO.write(LED, 0);
   ohoh = true;
}, null);
GPIO.enable_int(D2);
  
GPIO.set_mode(LED, GPIO.MODE_OUTPUT);
let tid = Timer.set(200, true, function() {
  GPIO.toggle(LED);
}, null);

function turnOff()
{
	print('Done. Good luck!');
	//D1 pulls the mosfet gate down to cut off the ground from the ESP
	GPIO.set_mode(D1, GPIO.MODE_OUTPUT);
	GPIO.write(D1, 1);
}

function retry()
{
  print('Ohoh no connection. tring again in 3 sec.');
  Timer.set(millisToWaitForReconnect, false, function() {
    callHome();
  }, null);
}

function callHome()
{
    //beeped again?
    if(ohoh)
    {
		HTTP.query({
			url: smokeUrl,
			success: function(){
				Timer.set(millisToWaitAfterSmokeCall, false, turnOff, null);
			},
			error: callHome,
		});
    }
    else
    {
		HTTP.query({
			  url: batteryLowUrl,
			  success: turnOff,
			  error: callHome,
			});
    }
	if(ohoh)
}

//wait for one second for short single alarms to turn off
Timer.set(millisToWaitFirst, false, function() {
  testing = true;
  print('A second passed. Testing for more beeps');
  //testing if eine beep for the next 5 seconds  
  Timer.set(millisToTestForBeeps, false, function() {
    print('Calling home.');
    if(ohoh)
  		print('Smoke detected');
    else
  		print('Battery low');
    callHome();
  }, null);
}, null);
