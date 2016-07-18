EXE=circuitbomb
OBJ=$(shell ls *.c | sed "s/\.c/\.o/")
CC=gcc
CFLAGS=-Wall
LFLAGS=
LIBS=

default: all

all: $(EXE) $(OBJ)

$(EXE):
	$(CC) $(CFLAGS) $(OBJ) -o $(EXE) $(LIBS)

%.o: %.c
	$(CC) $(CFLAGS) -o $@ -c $<
