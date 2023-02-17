#ifndef COMMANDLINE_H
#define COMMANDLINE_H

#include <QObject>

using namespace std;

class Wayfinder : public QObject
{
    Q_OBJECT
public:
    explicit Wayfinder(QObject *parent = 0);
    Q_INVOKABLE string connect(string ip_address);

signals:

public slots:
};

#endif // COMMANDLINE_H
