import { humanize } from "@/lib/utils/textConverter";
import * as Icon from "react-feather";

const HomapageFeature = ({ feature_list }) => {
  return (
    <div className="key-feature-grid mt-10 grid grid-cols-2 gap-7 md:grid-cols-3 xl:grid-cols-4">
      {feature_list.map((item, i) => {
        return (
          <div
            key={i}
            className="flex flex-col justify-between rounded-lg bg-white p-5 shadow-lg"
          >
            <div>
              <h3 className="h4 text-xl lg:text-2xl">{item.title}</h3>
              <p>{item.content}</p>
            </div>
            <span className="icon mt-4">
              <img
                src={`/images/icons/${item.icon}.svg`}  // Path to the SVG
                alt={item.title}
                width={50}  // Adjust the size as needed
                height={50}
                className="w-12 h-12"
              />
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default HomapageFeature;
