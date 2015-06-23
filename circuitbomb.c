#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>

#include <sys/time.h>
#include <sys/types.h>

#ifdef _WIN32
   #include <conio.h>
   #include <winsock.h>
#else
   #include <termio.h>
#endif

#define DEFAULT_SWITCHES   1
#define MAX_SWITCHES       1000

#define INPUT_1            0
#define INPUT_2            1
#define INPUT_MAX          2

#define GATE_NONE         -2
#define GATE_SWITCH       -1
#define GATE_AND           0
#define GATE_OR            1
#define GATE_XOR           2
#define GATE_NAND          3
#define GATE_NOR           4
#define GATE_XNOR          5
#define GATE_MAX           6

/* our typedefs! */
/* TODO: put in a header file. */
typedef struct _game_type game_type;
typedef struct _gate_type gate_type;

/* gates on top of our circuit. */
struct _gate_type {
   gate_type *in[INPUT_MAX];
   gate_type *out;
   int inv[INPUT_MAX];
   int out_side;
   int type;
   int value;
   int goal;
   int switch_num;

   /* link data. */
   game_type *state;
   gate_type *prev, *next;
   gate_type *top_prev, *top_next;
};

/* the main game state. */
struct _game_type {
   /* user-specified state data. */
   int level;

   /* switch data. */
   int switch_count;
   int switch_pos[MAX_SWITCHES];
   int switch_win[MAX_SWITCHES];

   /* our timer data. */
   struct timeval timer, last_time;

   /* gate link lists. */
   int top_count;
   int switch_sequence;
   gate_type *switch_gate[MAX_SWITCHES];
   gate_type *gate_list;
   gate_type *gate_top_list;
};

/* function prototypes. */
int game_state_init (game_type **gsp, int level, int bomb_time);
int game_make_switches_sequential (game_type *game);
int game_make_switches_sequential_real (gate_type *gate);
int game_update_timer (game_type *game);
gate_type *gate_new_blank (game_type *game, int goal);
gate_type *gate_new_switch (game_type *game, int switch_num, int goal);
int gate_free (gate_type *gate);
int gate_print (gate_type *g);
int gate_print_real (gate_type *g, int level);
gate_type *gate_get_top_by_index (game_type *game, int index);
int gate_unlink_top (gate_type *gate);
gate_type *gate_new_random (gate_type *g1, gate_type *g2, int goal);
gate_type *gate_new (gate_type *g1, int g1inv, gate_type *g2, int g2inv,
                     int goal, int type);
char *gate_name (int type);
int gate_calculate (gate_type *gate);
char switch_key (int num);
int key_switch (int key);
int terminal_set_nonblocking (int fd, int state);
int keyboard_hit (int secs, int usecs);
int get_single_char (void);

/* our game state. */
game_type *g_state = NULL;

#ifdef _WIN32
#define random(x)  rand(x)
#define srandom(x) srand(x)

int timersub (struct timeval *tv1, struct timeval *tv2, struct timeval *tv_out)
{
   tv_out->tv_sec  = tv1->tv_sec  - tv2->tv_sec;
   tv_out->tv_usec = tv1->tv_usec - tv2->tv_usec;
   while (tv_out->tv_usec < 0) {
      tv_out->tv_sec--;
      tv_out->tv_usec += 1000000;
   }
   while (tv_out->tv_usec >= 1000000) {
      tv_out->tv_sec++;
      tv_out->tv_usec -= 1000000;
   }
   return 1;
}
#endif

int game_state_init (game_type **gsp, int level, int bomb_time)
{
   game_type *gs;
   gate_type *g1, *g2;
   int i, same, r1, r2;

   /* if we haven't allocated our game state yet, do that here. */
   if (*gsp == NULL) {
      gs = malloc (sizeof (game_type));
      memset (gs, 0, sizeof (game_type));
      *gsp = gs;
   }
   /* otherwise, clear previous data. */
   else {
      gs = *gsp;
      while (gs->gate_list)
         gate_free (gs->gate_list);
   }

   /* zero-out our structure. */
   memset (gs, 0, sizeof (game_type));

   /* set some basic data. */
   gs->level        = level;
   gs->switch_count = level + 1;
   if (gs->switch_count < 2)
      gs->switch_count = 2;
   if (gs->switch_count > MAX_SWITCHES)
      gs->switch_count = MAX_SWITCHES - 1;

   /* initialize our timer. */
   gettimeofday (&(gs->last_time), NULL);
   gs->timer.tv_sec  = bomb_time;
   gs->timer.tv_usec = 999999;

   /* randomize switches. */
   same = 0;
   for (i = 0; i < gs->switch_count; i++) {
      gs->switch_pos[i] = random () & 1;
      gs->switch_win[i] = random () & 1;
      if (gs->switch_pos[i] == gs->switch_win[i])
         same++;
   }

   /* if our current state is the same as our victory state, that's boring!
    * reverse all switches. */
   if (same == gs->switch_count)
      for (i = 0; i < gs->switch_count; i++)
         gs->switch_pos[i] ^= 1;

   /* create top-level 'gates' as outputs linked to switches. */
   for (i = 0; i < gs->switch_count; i++)
      gate_new_switch (gs, i, gs->switch_win[i]);

   /* pair off top-level gates into new gates until there's only two left. */
   while (gs->top_count > 2) {
      /* pick two unique random gate indexes. */
      r1 = random () % gs->top_count;
      r2 = random () % (gs->top_count - 1);
      if (r2 >= r1) {
         r2++;
      }
      else {
         r1 ^= r2;
         r2 ^= r1;
         r1 ^= r2;
      }

      /* link those two together! */
      g1 = gate_get_top_by_index (gs, r1);
      g2 = gate_get_top_by_index (gs, r2);
      gate_new_random (g1, g2, random () & 1);
   }

   /* make a final gate with an OFF goal.  must DISABLE the bomb! */
   gate_new_random (gate_get_top_by_index (gs, 0),
                    gate_get_top_by_index (gs, 1),
                    0);

   /* make sure switches are in order so the brain is less pressured. */
   game_make_switches_sequential (gs);

   /* return success, because why not? */
   return 1;
}

int game_make_switches_sequential (game_type *game)
{
   game->switch_sequence = 0;
   return game_make_switches_sequential_real (game->gate_top_list);
}

int game_make_switches_sequential_real (gate_type *gate)
{
   int i, seq, count;
   game_type *gs;

   /* don't do anything if we've already run out of switches. */
   gs = gate->state;
   if (gs->switch_sequence == gs->switch_count)
      return 0;

   /* if there are switches, make sure their in sequence.
    * if there are input gates, recursively check them for switches. */
   count = 0;
   for (i = 0; i < INPUT_MAX; i++) {
      if (!gate->in[i])
         continue;
      if (gate->in[i]->type == GATE_SWITCH) {
         /* do we need to modify this switch? */
         seq = gs->switch_sequence;
         if (gate->in[i]->switch_num != seq) {
            count++;
            gate->in[i]->switch_num = seq;
            gs->switch_gate[seq] = gate->in[i];
            gs->switch_pos[seq]  = gate->in[i]->value;
            gs->switch_win[seq]  = gate->in[i]->goal;
         }
         gs->switch_sequence++;
      }
      else
         count += game_make_switches_sequential_real (gate->in[i]);
   }

   /* return the number of switches modified. */
   return count;
}

int game_update_timer (game_type *game)
{
   struct timeval tv, diff, new_timer;
   int old_secs;

   /* how much time passed between our last check? */
   gettimeofday (&tv, NULL);
   timersub (&tv, &(game->last_time), &diff);
   game->last_time = tv;

   /* modify our timer. */
   old_secs = game->timer.tv_sec;
   timersub (&(game->timer), &diff, &new_timer);
   game->timer = new_timer;

   /* return the number of seconds we lost. */
   return old_secs - game->timer.tv_sec;
}

gate_type *gate_get_top_by_index (game_type *game, int index)
{
   gate_type *g;

   /* barf when we get illegal values. */
   if (index < 0 || index >= game->top_count) {
      printf ("gate_get_top_by_index(): Illegal index '%d' (%d top gates)!\n",
              index, game->top_count);
      return NULL;
   }

   /* count forward 'index' gates and return the current one. */
   for (g = game->gate_top_list; g != NULL; g = g->top_next) {
      if (index == 0)
         return g;
      index--;
   }

   /* oh, crap! */
   printf ("gate_get_top_by_index(): We should never reach here! D:\n");
   return NULL;
}

int gate_unlink_top (gate_type *gate)
{
   /* check all link conditions. */
   if (!(gate->top_prev || gate->top_next ||
         gate->state->gate_top_list == gate))
      return 0;

   /* properly unlink from the game state. */
   if (gate->top_next) gate->top_next->top_prev = gate->top_prev;
   if (gate->top_prev) gate->top_prev->top_next = gate->top_next;
   else              gate->state->gate_top_list = gate->top_next;

   /* blank-out our info. */
   gate->top_next = NULL;
   gate->top_prev = NULL;

   /* decrement the top link counter and return success. */
   gate->state->top_count--;
   return 1;
}

gate_type *gate_new_blank (game_type *game, int goal)
{
   gate_type *new, *g;

   /* create our new gate with some basic initialization. */
   new = malloc (sizeof (gate_type));
   memset (new, 0, sizeof (gate_type));
   new->state      = game;
   new->goal       = goal;
   new->type       = GATE_NONE;
   new->switch_num = -1;

   /* link to the game state. */
   if (game->gate_list == NULL)
      game->gate_list = new;
   else {
      for (g = game->gate_list; g->next != NULL; g = g->next);
      g->next = new;
      new->prev = g;
   }

   /* link to the top gate list. */
   if (game->gate_top_list == NULL)
      game->gate_top_list = new;
   else {
      for (g = game->gate_top_list; g->top_next != NULL; g = g->top_next);
      g->top_next = new;
      new->top_prev = g;
   }

   /* increase the number of top links. */
   game->top_count++;
   
   /* return the new gate. */
   return new;
}

gate_type *gate_new_switch (game_type *game, int switch_num, int goal)
{
   gate_type *new;

   /* create a blank gate that takes a switch input. */
   new = gate_new_blank (game, goal);

   /* assign SWITCH data. */
   new->type       = GATE_SWITCH;
   new->switch_num = switch_num;
   game->switch_gate[switch_num] = new;

   /* set the value of this new gate. */
   gate_calculate (new);

   /* return the new switch output gate. */
   return new;
}

gate_type *gate_new_random (gate_type *g1, gate_type *g2, int goal)
{
   int inv1, inv2, type, v1, v2;

   /* should the values be inverted? */
   inv1 = random () & 1;
   inv2 = inv1;

   /* if the goals of both inputs are not equal (0,1 or 1,0),
    * their inversions should be OPPOSITE so there is guaranteed
    * to be only 1 positive case. */
   if (g1->goal != g2->goal)
      inv2 ^= 1;

   /* based on the desired value and the desired values of the potentially
    * inverted inputs, determine the proper gate to use. */
   v1 = g1->goal ^ inv1;
   v2 = g2->goal ^ inv2;
        if (goal == 0 && v1 == 0 && v2 == 0) type = GATE_OR;
   else if (goal == 0 && v1 == 1 && v2 == 1) type = GATE_NAND;
   else if (goal == 1 && v1 == 0 && v2 == 0) type = GATE_NOR;
   else if (goal == 1 && v1 == 1 && v2 == 1) type = GATE_AND;
   else {
      printf ("INVALID VALUE: [goal:%d, v1:%d, v2:%d] (inv1:%d, inv2:%d)\n",
              goal, v1, v2, inv1, inv2);
      type = GATE_NONE;
   }

   /* make dat gate! */
   return gate_new (g1, inv1, g2, inv2, goal, type);
}

gate_type *gate_new (gate_type *g1, int g1inv, gate_type *g2, int g2inv,
                     int goal, int type)
{
   gate_type *new;

   /* create a new link with some basic assignments. */
   new = gate_new_blank (g1->state, goal);
   new->type = type;
   new->inv[0] = g1inv;
   new->inv[1] = g2inv;

   /* properly link our first input... */
   new->in[0] = g1;
   gate_unlink_top (g1);
   g1->out = new;
   g1->out_side = INPUT_1;

   /* ...and our second. */
   new->in[1] = g2;
   gate_unlink_top (g2);
   g2->out = new;
   g2->out_side = INPUT_2;

   /* set the value of this new gate. */
   gate_calculate (new);

   /* return our new gate. */
   return new;
}

int gate_calculate (gate_type *gate)
{
   int count, v1, v2, new_value;

   /* for switch gates, the value is simply set to the switch. */
   count = 1;

   if (gate->type == GATE_SWITCH)
      new_value = gate->state->switch_pos[gate->switch_num];
   /* otherwise, take the two inputs and perform some logic. */
   else if (gate->in[0] && gate->in[1]) {
      v1 = gate->in[0]->value ^ gate->inv[0];
      v2 = gate->in[1]->value ^ gate->inv[1];

      switch (gate->type) {
         case GATE_AND:  new_value = v1 & v2;       break;
         case GATE_OR:   new_value = v1 | v2;       break;
         case GATE_XOR:  new_value = v1 ^ v2;       break;
         case GATE_NAND: new_value = (v1 & v2) ^ 1; break;
         case GATE_NOR : new_value = (v1 | v2) ^ 1; break;
         case GATE_XNOR: new_value = (v1 ^ v2) ^ 1; break;
         default:        new_value = 0;
      }
   }
   else
      new_value = 0;

   /* don't do anything if the value hasn't changed. */
   if (gate->value == new_value)
      return 0;

   /* set our new value. */
   gate->value = new_value;

   /* if there's an output gate, it's input has been modified.
    * make sure it has the right value. */
   if (gate->out)
      count += gate_calculate (gate->out);

   /* return the number of gates modified. */
   return count;
}

int gate_free (gate_type *gate)
{
   int i;

   /* make sure this gate is unlinked from the switch. */
   if (gate->switch_num >= 0)
      gate->state->switch_gate[gate->switch_num] = NULL;

   /* unlink input gates. */
   for (i = 0; i < INPUT_MAX; i++)
      if (gate->in[i])
         gate->in[i]->out = NULL;

   /* unlink the output gate. */
   if (gate->out)
      gate->out->in[gate->out_side] = NULL;

   /* unlink global list. */
   if (gate->next) gate->next->prev = gate->prev;
   if (gate->prev) gate->prev->next = gate->next;
   else      gate->state->gate_list = gate->next;

   /* unlink TOP list. */
   gate_unlink_top (gate);

   /* free our own structure. */
   free (gate);

   /* free success! */
   return 1;
}

int gate_print (gate_type *g)
{
   return gate_print_real (g, 0);
}

int gate_print_real (gate_type *g, int level)
{
   int i, count, print_val;
   char buf[256];

   /* what value should be printed? */
   if (g->type == GATE_SWITCH)
      print_val = g->state->switch_pos[g->switch_num];
   else
      print_val = g->value;

   /* enable color. */
   if (print_val) {
      if (g->type == GATE_SWITCH) printf ("\x1b[46;37;1m");
      else                        printf ("\x1b[33;1m");
   }
   else {
      if (g->type == GATE_SWITCH) printf ("\x1b[44;37;1m");
      else                        printf ("\x1b[31m");
   }
   putchar (g->value == print_val ? ' ' : '*');

   /* what's the switch number? */
   if (g->type == GATE_SWITCH)
      snprintf (buf, sizeof (buf), "%c ",
                switch_key (g->switch_num));
   else
      buf[0] = '\0';

   /* print this gate... */
   count = 1;
   printf ("%s %s%s",
      gate_name (g->type), buf,
      print_val ? "[On] " : "[Off]");

   /* uncolor. */
   printf (" \x1b[0m\n");

   /* ...and all inputs. */
   for (i = 0; i < INPUT_MAX; i++) {
      if (g->in[i]) {
         printf ("%*s%s%d) ", level * 3, "",
                 g->inv[i] ? "\x1b[41;37;1m!\x1b[0m" : " ", i + 1);
         count += gate_print_real (g->in[i], level + 1);
      }
   }

   /* return the total number of gates printed. */
   return count;
}

char *gate_name (int type)
{
   switch (type) {
      case GATE_NONE:   return "None";
      case GATE_SWITCH: return "Switch";
      case GATE_AND:    return "AND";
      case GATE_OR:     return "OR";
      case GATE_XOR:    return "XOR";
      case GATE_NAND:   return "NAND";
      case GATE_NOR:    return "NOR";
      case GATE_XNOR:   return "XNOR";
      default:          return "Unknown";
   }
}

char switch_key (int num) {
   if (num >= 0 && num <= 8)
      return '1' + num;
   else if (num == 9)
      return '0';
   else if (num - 10 < 26)
      return 'a' + (num - 10);
   else if (num - 36 < 26)
      return 'A' + (num - 36);
   else
      return '?';
}

int key_switch (int key) {
   if (key >= '1' && key <= '9')
      return key - '1';
   else if (key == '0')
      return 9;
   else if (key >= 'a' && key <= 'z')
      return key - 'a' + 10;
   else if (key >= 'A' && key <= 'Z')
      return key - 'A' + 36;
   else
      return -1;
}

int terminal_set_nonblocking (int fd, int state)
{
#ifdef _WIN32
   return 0;
#else
   struct termios ttystate;
   int old;

   /* get terminal state and remember our original flags. */
   tcgetattr (fd, &ttystate);
   old = ttystate.c_lflag;

   /* are we turning non-blocking on? */
   if (state) {
      ttystate.c_lflag &= ~(ICANON | ECHO);
      ttystate.c_cc[VMIN] = 1;
   }
   /* ...or off? */
   else {
      ttystate.c_lflag |= (ICANON | ECHO);
   }

   /* set the terminal state. */
   tcsetattr (fd, TCSANOW, &ttystate);

   /* return 1 if the state changed, 0 if not. */
   return (old == ttystate.c_lflag) ? 0 : 1;
#endif
}

int keyboard_hit (int secs, int usecs)
{
#ifdef _WIN32
   return kbhit ();
#else
   struct timeval tv, *delay;
   fd_set fds;

   /* what's our delay?  negative values are indefinite. */
   if (secs < 0 || usecs < 0)
      delay = NULL;
   else {
      tv.tv_sec  = secs;
      tv.tv_usec = usecs;
      delay = &tv;
   }

   /* use select() to see if input is available immediately. */
   FD_ZERO (&fds);
   FD_SET (STDIN_FILENO, &fds);
   select (STDIN_FILENO + 1, &fds, NULL, NULL, delay);

   /* return whether or not input is available. */
   return FD_ISSET (STDIN_FILENO, &fds);
#endif
}

int get_single_char (void)
{
#ifdef _WIN32
   return getch ();
#else
   return getchar ();
#endif
}

int main (int argc, char **argv)
{
   int i, key, quit, switch_num, force_break, key_wait_secs, key_wait_usecs;
   gate_type *g;

   /* seed our random functions. */
   srandom (time (NULL));

   // enable non-blocking mode.
   terminal_set_nonblocking (STDIN_FILENO, 1);

   printf ("\x1b[2J\x1b[1;1H"
           "-------------------------------------------------------\n"
           "| Circuit Bomb Test                                   |\n"
           "|    written, directed, and produced by Simon Bielman |\n"
           "|    Copyrite (c) 2015 Baroque Creations, LLC         |\n"
           "-------------------------------------------------------\n\n");
   printf ("Make sure the window is big - 80x50 should do the trick.\n"
           "To learn how to play, check out 'README.txt'.\n\n"
           "Press any key to start!\n");
   get_single_char ();

   /* initialize our game state. */
   game_state_init (&g_state, 1, 60);
   quit = 0;

   while (!quit) {
      /* print all of our gates. */
      printf ("\x1b[2J\x1b[1;1H\x1b[37;1;42m");
      printf ("\x1b[0K\n");
      printf ("\x1b[0K   LEVEL %d\n", g_state->level);
      printf ("\x1b[0K\n\x1b[0m\n");

      /* did we lose?  let us know! */
      if (g_state->timer.tv_sec < 0) {
         /* but if we JUST disabled the circuit, be nice and not explode :) */
         if (g_state->gate_top_list->value == 0) {
            g_state->timer.tv_sec  = 0;
            g_state->timer.tv_usec = 1;
         }
         else {
            printf ("\x1b[37;1;41m");
            printf ("\x1b[0K\n");
            printf ("\x1b[0K   KABOOM!\n");
            printf ("\x1b[0K\n\x1b[0m\n");
            printf ("\x1b[37;1mLooks like you lost! Try again next time!"
                    "\x1b[0m\n\n");
            break;
         }
      }

      /* print our timer. */
      printf ("\x1b[37;1mSelf-Destruct in:\x1b[0m\n");
      printf ("   \x1b[41;37;1m %02ld:%02ld \x1b[0m\n\n",
         g_state->timer.tv_sec / 60l, g_state->timer.tv_sec % 60l);

      /* print our circuitry. */
      printf ("\x1b[1mCircuit:\x1b[0m\n");
      for (g = g_state->gate_top_list; g != NULL; g = g->top_next)
         gate_print_real (g, 1);
      printf ("\n");

      /* print all of our switches. */
      printf ("\x1b[1mSwitches:\x1b[0m\n   ");
      for (i = 0; i < g_state->switch_count; i++) {
         if (i % 4 == 0 && i != 0)
            printf ("\n   ");
         printf ("\x1b[%d;37;1m%cSwitch %c %s \x1b[0m ",
            g_state->switch_pos[i] ? 46 : 44,
            g_state->switch_pos[i] != g_state->switch_gate[i]->value ?
               '*' : ' ',
            switch_key (i), g_state->switch_pos[i] ? "[On ]" : "[Off]");
      }
      printf ("\n\n");

      /* have we won?  if so, advance to the next level! */
      if (g_state->gate_top_list->value == 0) {
         printf ("\x1b[37;1;46m");
         printf ("\x1b[0K\n");
         printf ("\x1b[0K   Circuit Disabled!\n");
         printf ("\x1b[0K\n\x1b[0m\n");
         printf ("\x1b[37;1m"
            "One minute has been added to the countdown timer!\n"
            "Press any key to advanced to the next level."
            "\x1b[0m\n\n");
         get_single_char ();
         game_state_init (&g_state, g_state->level + 1, g_state->timer.tv_sec);
         continue;
      }

      printf ("\x1b[1mControls:\x1b[0m\n"
              "  Toggle Switch:  1 - 0, a - z, A - Z\n"
              "  Test Switches:  Space / Enter\n"
              "  Quit:           Escape\n\n");

      /* looks like we're playing!  do some initialization. */
      force_break    = 0;
      key_wait_secs  = 0;
      key_wait_usecs = 0;

      printf ("\x1b[1mCommand:\x1b[0m\n\n");
      while (!force_break) {
         /* wait for a key during the duration for the timer to drop
          * by one second. */
         if (key_wait_secs > 0 && key_wait_usecs < g_state->timer.tv_usec)
            key_wait_usecs = g_state->timer.tv_usec;

         /* get our first character and any extra stray characters. */
         key = '\0';
         while (keyboard_hit (key_wait_secs, 0)) {
            key = get_single_char ();
            key_wait_secs  = 0;
            key_wait_usecs = 0;
         }

         /* if our timer updated, force a redraw. */
         if (game_update_timer (g_state))
            force_break = 1;

         /* do nothing if we didn't actually hit a key. */
         if (key == '\0')
            continue;

         printf ("\x1b[1K");
         if (key == '\x1b') {
            printf ("Escape hit.  Quitting!\n\n");
            quit = 1;
            break;
         }
         else if ((switch_num = key_switch (key)) >= 0) {
            if (switch_num < g_state->switch_count) {
               g_state->switch_pos[switch_num] ^= 1;
               break;
            }
            else
               printf ("This level doesn't have switch '%c'.", key);
         }
         else if (key == ' ' || key == '\n' || key == '\r') {
            /* update our circuit. */
            for (i = 0; i < g_state->switch_count; i++)
               gate_calculate (g_state->switch_gate[i]);

            /* wait 1 second. */
            printf ("\x1b[37;1mUpdating circuit [          ]\x1b[11D");
            fflush (stdout);
            for (i = 0; i < 10; i++) {
               usleep (100000);
               putchar ('.');
               fflush (stdout);
            }
            usleep (100000);
            printf ("\x1b[0m");
            fflush (stdout);

            /* make sure the timer doesn't update. */
            gettimeofday (&(g_state->last_time), NULL);

            /* 5 second penalty for each bad circuit check... */
            if (g_state->gate_top_list->value)
               g_state->timer.tv_sec -= 5;
            /* ...and an extra minute for success! */
            else
               g_state->timer.tv_sec += 60;

            /* go to the next frame. */
            break;
         }
         else
            printf ("Unknown key '%c'.", key);

         /* if we reached this point, we should have barfed an error out.
          * let it stay for one second, and force a redraw. */
         printf ("\x1b[1G");
         fflush (stdout);
         key_wait_secs = 1;
      }
   }

   /* reset our terminal. */
   terminal_set_nonblocking (STDIN_FILENO, 0);

   /* return not fail at all! */
   return 0;
}
