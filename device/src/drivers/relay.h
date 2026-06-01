/* relay.h - 继电器控制 (水泵/电磁阀) */

#ifndef RELAY_H
#define RELAY_H


void relay_init(unsigned int pin);
void relay_on(void);
void relay_off(void);
int  relay_state(void);  /* 返回 1:开 0:关 */

#endif /* RELAY_H */
