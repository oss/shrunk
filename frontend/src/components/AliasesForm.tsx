import { Button, Card, Col, Form, Input, Row } from 'antd/lib';
import { CircleMinusIcon } from 'lucide-react';
import React from 'react';
import { serverValidateDuplicateAlias } from '../api/validators';

interface IAliasesForm {
  mayUseCustomAliases: boolean;

  initialAliases: string[];
}

export default function AliasesForm(props: IAliasesForm) {
  const serverValidateReservedAliasWithInitialAliases = async (
    _: any,
    value: string,
  ): Promise<void> => {
    if (props.initialAliases.includes(value)) {
      return Promise.resolve();
    }

    return serverValidateDuplicateAlias(_, value);
  };

  return (
    <Form.Item label="Aliases">
      <Form.List name="aliases">
        {(fields, { add, remove }) => (
          <div className="tw-flex tw-flex-col tw-gap-4">
            {fields.length < 6 && (
              <Button type="dashed" onClick={() => add()} block>
                + Add Alias
              </Button>
            )}
            {fields.map((field, index) => (
              <Card
                title={`Alias ${index + 1}`}
                size="small"
                key={field.key}
                extra={
                  fields.length > 1 && (
                    <Button
                      type="text"
                      icon={<CircleMinusIcon />}
                      onClick={() => {
                        if (fields.length > 1) {
                          remove(field.name);
                        }
                      }}
                    />
                  )
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    {!props.mayUseCustomAliases ? (
                      <></>
                    ) : (
                      <Form.Item
                        label="Alias"
                        name={[field.name, 'alias']}
                        rules={[
                          {
                            min: 5,
                            message:
                              'Aliases may be no shorter than 5 characters.',
                          },
                          {
                            max: 60,
                            message:
                              'Aliases may be no longer than 60 characters.',
                          },
                          {
                            pattern: /^[a-zA-Z0-9_.,-]*$/,
                            message:
                              'Aliases may consist only of numbers, letters, and the punctuation marks “.,-_”.',
                          },
                          {
                            validator:
                              serverValidateReservedAliasWithInitialAliases,
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                    )}
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Description"
                      name={[field.name, 'description']}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}
      </Form.List>
    </Form.Item>
  );
}
