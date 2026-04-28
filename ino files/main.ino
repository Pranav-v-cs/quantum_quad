#include <OneWire.h>
#include <DallasTemperature.h>
#include <SoftwareSerial.h>

#define TEMPERATURE 2
#define TURBIDITY A0
#define TDS A1
#define PH A2
#define DO A3

#define VREF 5.0   
#define ADC_RES 1024           
#define SCOUNT 30

#define CALI_V 3564 
#define CALI_T 32

const float m = -5.436;

const int DO_Table[41] = {
  14460, 14220, 13820, 13440, 13090, 12740, 12420, 12110, 11810, 11530,
  11260, 11010, 10770, 10530, 10300, 10080, 9860, 9660, 9460, 9270,
  9080, 8900, 8730, 8570, 8410, 8250, 8110, 7960, 7820, 7690,
  7560, 7430, 7300, 7180, 7070, 6950, 6840, 6730, 6630, 6530, 6410
};

OneWire oneWire(TEMPERATURE);
DallasTemperature sensors(&oneWire);
SoftwareSerial mySerial(11, 10);

static float temp;
int turbidityValue;
float phValue;
int tdsValue;
float DOValue;

int analogBufferTemp[SCOUNT];

float averageVoltage = 0;

// median filtering algorithm
int getMedianNum(int bArray[], int iFilterLen){
  int bTab[iFilterLen];
  for (byte i = 0; i<iFilterLen; i++)
  bTab[i] = bArray[i];
  int i, j, bTemp;
  for (j = 0; j < iFilterLen - 1; j++) {
    for (i = 0; i < iFilterLen - j - 1; i++) {
      if (bTab[i] > bTab[i + 1]) {
        bTemp = bTab[i];
        bTab[i] = bTab[i + 1];
        bTab[i + 1] = bTemp;
      }
    }
  }
  if ((iFilterLen & 1) > 0){
    bTemp = bTab[(iFilterLen - 1) / 2];
  }
  else {
    bTemp = (bTab[iFilterLen / 2] + bTab[iFilterLen / 2 - 1]) / 2;
  }
  return bTemp;
}

float readTemperature() {
  sensors.requestTemperatures(); 
  float temp = sensors.getTempCByIndex(0);

  return temp;
}

int readTurbidity() {
  float turbiditySensorValue = analogRead(TURBIDITY);
  int turbidityValue = map(turbiditySensorValue, 0,640, 100, 0);

  return turbidityValue;
}

float readPH() {
  float Po = analogRead(PH) * 5.0 / 1024;
  float pHValue = 7 - (2.5 - Po) * m;

  return pHValue;
}

int readTDS() {
  for(int i = 0; i < SCOUNT; i++){
    analogBufferTemp[i] = analogRead(TDS);
    delay(2); 
  }
  
  averageVoltage = getMedianNum(analogBufferTemp, SCOUNT) * (float)VREF / 1024.0;
  float compensationCoefficient = 1.0 + 0.02 * (temp - 25.0);
  
  float compensationVoltage = averageVoltage / compensationCoefficient;
  tdsValue = (133.42 * compensationVoltage * compensationVoltage * compensationVoltage - 255.86 * compensationVoltage * compensationVoltage + 857.39 * compensationVoltage) * 0.5;

  return tdsValue;
}

float readDO() {
  float ADC_Raw = analogRead(DO);
  
  float ADC_Voltage_mV = (VREF * 1000.0) * ADC_Raw / ADC_RES;

  int safe_temp = (int)temp;
  if (safe_temp < 0) {
    safe_temp = 0;
  } else if (safe_temp > 40) {
    safe_temp = 40;
  }

  int V_saturation = CALI_V + 35 * safe_temp - CALI_T * 35;
  
  return (ADC_Voltage_mV * DO_Table[safe_temp] / V_saturation) / 1000.0;
}

void setup(void)
{
  pinMode(TURBIDITY, INPUT);
  pinMode(TDS, INPUT);

  mySerial.begin(9600);
  Serial.begin(19200);
  
  sensors.begin();
}

void loop(void)
{ 
  // Temperature reading
  temp = readTemperature();

  // turbidity reading
  turbidityValue = readTurbidity();

  // ph reading
  phValue = readPH();

  // TDS Reading
  tdsValue = readTDS();

  // DO Reading
  DOValue = readDO();

  // print readings  
  if(temp != DEVICE_DISCONNECTED_C) 
  {
    Serial.print("Temperature: ");
    Serial.print(temp);
    Serial.print(" °C   |   ");

    Serial.print("Turbidity: ");
    Serial.print(turbidityValue);
    Serial.print(" NTU   |   ");

    Serial.print("pH: ");
    Serial.print(phValue);
    Serial.print("   |   ");

    Serial.print("TDS: ");
    Serial.print(tdsValue);
    Serial.print(" ppm  |  ");

    Serial.print("DO: ");
    Serial.print(DOValue);
    Serial.println(" mg/L");

    // ------------------------------

    mySerial.print("Temperature:");
    mySerial.print(temp, 2);
    mySerial.print("|Turbidity:");
    mySerial.print(turbidityValue);
    mySerial.print("|pH:");
    mySerial.print(phValue, 2);
    mySerial.print("|TDS:");
    mySerial.print(tdsValue);
    mySerial.print("|DO:");
    mySerial.print(DOValue, 2);
    mySerial.println();
  } 
  else 
  {
    Serial.println("Error: Could not read temperature data. Check wiring!");
    mySerial.println("Error: Could not read temperature data. Check wiring!");
  }
  delay(1000); 
}
