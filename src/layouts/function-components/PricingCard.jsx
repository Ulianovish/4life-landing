import React from "react";
import { BsPinAngleFill } from "react-icons/bs";
import { humanize } from "@/lib/utils/textConverter";
import * as Icon from "react-feather";

const PricingCard = ({ item }) => {
  return (
    <div className="mt-8 px-3 md:col-6 lg:col-4 lg:mt-0" key={item.title}>
      <div
        className={`rounded-xl bg-white px-8 py-10 shadow-lg ${item.featured ? "-mt-16 border border-primary " : undefined
          }`}
      >
        <h2 className="h3">{item.title}</h2>

        <div className="my-6  py-6">

          <ul className="mt-6">
             {item.services.list.map((service, i) => (
               <li className="mb-3 text-sm" key={`service-${i}`}>
                 <span className="mr-2">
                   <BsPinAngleFill
                     className={`mr-1 inline h-[14px] w-[14px] ${
                       item.featured ? "text-primary" : undefined
                     }`}
                   />
                 </span>
                 {service}
               </li>
             ))}
           </ul>
        </div>

        <div className="text-center">
          <a
            className={`btn ${item.featured ? "btn-primary" : "btn-outline-white"
              } block h-[48px] w-full rounded-[50px] leading-[30px]`}
            href={item.buttons.buy_now.link}
          >
            {item.buttons.buy_now.label}
          </a>
        </div>
      </div>
    </div>
  );
};

export default PricingCard;
