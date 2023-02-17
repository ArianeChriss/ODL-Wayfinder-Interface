#include "CommandLine.h"
#include <QDebug>

using namespace std;

Wayfinder::Wayfinder(QObject *parent):
QObject(parent)
{
}

string Wayfinder::connect(string ip_address)
{
    return "help";
}
