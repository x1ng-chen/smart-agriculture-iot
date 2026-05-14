/* soil_moisture.c - 土壤湿度传感器驱动实现 */

#include "soil_moisture.h"

// Hi3861 ADC参考电压 3.3V, 10位精度
#define ADC_REF_VOLTAGE 3.3f
#define ADC_MAX_VALUE   1023.0f

static uint8_t pin;

void soil_moisture_init(uint8_t adc_pin)
{
    pin = adc_pin;
    // TODO: Hi3861 GPIO初始化, 设置ADC模式
}

float soil_moisture_read(void)
{
    // TODO: 读取ADC值并转换为湿度百分比
    // uint16_t adc_value = hi_adc_read(pin);
    // float voltage = (adc_value / ADC_MAX_VALUE) * ADC_REF_VOLTAGE;
    // return (1.0f - voltage / ADC_REF_VOLTAGE) * 100.0f;
    return 0.0f;
}
