#ifndef COMMANDLINE_H
#define COMMANDLINE_H

#include <QObject>
#include <QtQml/qqmlregistration.h>
#include <QUrl>
#include <QString>
#include <iostream>
#include <stdio.h>
#include <stdlib.h>

using namespace std;

class Wayfinder : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    //QML_PROPERTY(QUrl url READ url WRITE setUrl)
public:
    explicit Wayfinder(QObject *parent = 0);// QUrl *q_url = new QUrl("https://192.168.1.153:8000"));// {
        //q_url = new QUrl("https://192.168.1.153:8000");
        //q_url.setUrl(&help);
    //};
    Q_INVOKABLE QString connect(QString ip_address);

    /*QUrl url() const;
    void setUrl(QString link) {
        q_url.setUrl(link);
    }*/

    virtual ~Wayfinder(){}

private:
    QUrl *q_url;

    string* command_strings = new string[1] {
            "echo thing"
    };

signals:

public slots:
};

#endif // COMMANDLINE_H
